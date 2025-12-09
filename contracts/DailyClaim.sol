// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITreasury {
    function creditReward(address player, address token, uint256 amount) external;
    function joybitToken() external view returns (address);
}

/**
 * @title DailyClaim
 * @notice Daily JOYB claim with streak bonuses
 */
contract DailyClaim is Ownable, ReentrancyGuard {
    ITreasury public treasury;
    
    uint256 public baseReward = 100 ether; // 100 JOYB
    uint256 public streakBonus = 10 ether; // 10 JOYB per streak day
    
    struct PlayerData {
        uint64 lastClaimTime;
        uint16 currentStreak;
        uint32 totalClaims;
        uint256 totalRewardsEarned;
    }
    
    mapping(address => PlayerData) public players;
    
    event DailyClaimed(address indexed player, uint256 reward, uint16 streak);
    event StreakBroken(address indexed player, uint16 oldStreak);
    event BaseRewardUpdated(uint256 newReward);
    event StreakBonusUpdated(uint256 newBonus);
    
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = ITreasury(_treasury);
    }
    
    // ============ CLAIM ============
    
    /**
     * @notice Claim daily JOYB reward
     */
    function claimDaily() external nonReentrant {
        PlayerData storage player = players[msg.sender];
        
        require(canClaim(msg.sender), "Already claimed today");
        
        // Check if streak continues
        uint64 timeSinceLastClaim = uint64(block.timestamp) - player.lastClaimTime;
        
        if (player.lastClaimTime == 0) {
            // First claim ever
            player.currentStreak = 1;
        } else if (timeSinceLastClaim <= 48 hours) {
            // Continue streak (within 48h window allows 24-48h between claims)
            player.currentStreak++;
        } else {
            // Streak broken
            emit StreakBroken(msg.sender, player.currentStreak);
            player.currentStreak = 1;
        }
        
        // Calculate reward
        uint256 reward = baseReward + (streakBonus * (player.currentStreak - 1));
        
        // Update player data
        player.lastClaimTime = uint64(block.timestamp);
        player.totalClaims++;
        player.totalRewardsEarned += reward;
        
        // Add reward to treasury pending
        treasury.creditReward(msg.sender, treasury.joybitToken(), reward);
        
        emit DailyClaimed(msg.sender, reward, player.currentStreak);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setBaseReward(uint256 _reward) external onlyOwner {
        baseReward = _reward;
        emit BaseRewardUpdated(_reward);
    }
    
    function setStreakBonus(uint256 _bonus) external onlyOwner {
        streakBonus = _bonus;
        emit StreakBonusUpdated(_bonus);
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = ITreasury(_treasury);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function canClaim(address player) public view returns (bool) {
        uint64 lastClaim = players[player].lastClaimTime;
        return block.timestamp >= lastClaim + 24 hours;
    }
    
    function getPlayerData(address player) external view returns (PlayerData memory) {
        return players[player];
    }
    
    function getClaimableReward(address player) external view returns (uint256) {
        if (!canClaim(player)) return 0;
        
        PlayerData memory data = players[player];
        uint64 timeSinceLastClaim = uint64(block.timestamp) - data.lastClaimTime;
        
        uint16 streak;
        if (data.lastClaimTime == 0) {
            streak = 1;
        } else if (timeSinceLastClaim <= 48 hours) {
            streak = data.currentStreak + 1;
        } else {
            streak = 1;
        }
        
        return baseReward + (streakBonus * (streak - 1));
    }
    
    function getTimeUntilNextClaim(address player) external view returns (uint256) {
        uint64 lastClaim = players[player].lastClaimTime;
        if (lastClaim == 0) return 0;
        
        uint64 nextClaim = lastClaim + 24 hours;
        if (block.timestamp >= nextClaim) return 0;
        
        return nextClaim - block.timestamp;
    }
}
