// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BaseboundGame
 * @notice Simple basebound game with 1 daily free play, adjustable fees for paid play and retry
 */
contract BaseboundGame is Ownable, ReentrancyGuard {
    address public treasury;
    
    // Game fees
    uint256 public playFee = 0.001 ether;
    uint256 public retryFee = 0.0005 ether;
    
    // Player data
    struct PlayerData {
        uint40 lastFreePlayTime;
        uint32 gamesPlayed;
        uint32 retriesUsed;
    }
    
    mapping(address => PlayerData) public players;
    
    event GamePlayed(address indexed player, uint256 fee);
    event RetryUsed(address indexed player, uint256 fee);
    event PlayFeeUpdated(uint256 newFee);
    event RetryFeeUpdated(uint256 newFee);
    event TreasuryUpdated(address newTreasury);
    
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
    
    // ============ GAME PLAY ============
    
    /**
     * @notice Start a game (free once per day, otherwise pay fee)
     */
    function playGame() external payable nonReentrant {
        PlayerData storage player = players[msg.sender];
        bool isFree = uint40(block.timestamp) >= player.lastFreePlayTime + 86400;
        
        if (isFree) {
            // Free play
            require(msg.value == 0, "Free play - no payment");
            player.lastFreePlayTime = uint40(block.timestamp);
        } else {
            // Paid play
            require(msg.value >= playFee, "Insufficient payment");
            
            // Send fee to treasury
            (bool success, ) = payable(treasury).call{value: playFee}("");
            require(success, "Fee transfer failed");
            
            // Refund excess
            if (msg.value > playFee) {
                (success, ) = payable(msg.sender).call{value: msg.value - playFee}("");
                require(success, "Refund failed");
            }
        }
        
        player.gamesPlayed++;
        
        emit GamePlayed(msg.sender, isFree ? 0 : playFee);
    }
    
    /**
     * @notice Retry in game by paying the retry fee
     */
    function retryGame() external payable nonReentrant {
        require(msg.value >= retryFee, "Insufficient payment");
        
        // Send fee to treasury
        (bool success, ) = payable(treasury).call{value: retryFee}("");
        require(success, "Fee transfer failed");
        
        // Refund excess
        if (msg.value > retryFee) {
            (success, ) = payable(msg.sender).call{value: msg.value - retryFee}("");
            require(success, "Refund failed");
        }
        
        players[msg.sender].retriesUsed++;
        
        emit RetryUsed(msg.sender, retryFee);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setPlayFee(uint256 _fee) external onlyOwner {
        playFee = _fee;
        emit PlayFeeUpdated(_fee);
    }
    
    function setRetryFee(uint256 _fee) external onlyOwner {
        retryFee = _fee;
        emit RetryFeeUpdated(_fee);
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function canPlayFree(address player) public view returns (bool) {
        uint40 lastPlay = players[player].lastFreePlayTime;
        return uint40(block.timestamp) >= lastPlay + 86400; // 24 * 60 * 60
    }
    
    function getPlayerData(address player) external view returns (PlayerData memory) {
        return players[player];
    }
}