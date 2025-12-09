// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITreasury {
    function creditReward(address player, address token, uint256 amount) external;
    function joybitToken() external view returns (address);
}

/**
 * @title CardGame
 * @notice 3-card game with free daily play and adjustable rewards
 */
contract CardGame is Ownable, ReentrancyGuard {
    ITreasury public treasury;
    
    uint256 public playFee = 0.002 ether;
    uint256 public winReward = 100 ether; // JOYB
    
    struct PlayerData {
        uint64 lastFreePlayTime;
        uint32 gamesPlayed;
        uint32 gamesWon;
        uint256 totalRewardsEarned;
    }
    
    mapping(address => PlayerData) public players;
    
    struct GameSession {
        address player;        // 20 bytes
        uint64 timestamp;      // 8 bytes
        uint8 selectedCard;    // 1 byte (0, 1, or 2)
        uint8 winningCard;     // 1 byte
        bool completed;        // 1 byte
        bool won;              // 1 byte
    }
    
    mapping(uint256 => GameSession) public sessions;
    uint256 public nextSessionId = 1;
    
    event GameStarted(uint256 indexed sessionId, address indexed player, bool isPaid);
    event GameCompleted(uint256 indexed sessionId, address indexed player, uint8 selectedCard, uint8 winningCard, bool won, uint256 reward);
    event PlayFeeUpdated(uint256 newFee);
    event WinRewardUpdated(uint256 newReward);
    
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = ITreasury(_treasury);
    }
    
    // ============ GAME PLAY ============
    
    /**
     * @notice Start a card game (free if within 24h cooldown, otherwise paid)
     */
    function playGame(uint8 selectedCard) external payable nonReentrant returns (uint256 sessionId) {
        require(selectedCard <= 2, "Invalid card selection");
        
        PlayerData storage player = players[msg.sender];
        bool isFree = canPlayFree(msg.sender);
        
        if (isFree) {
            require(msg.value == 0, "Free play - no payment");
            player.lastFreePlayTime = uint64(block.timestamp);
        } else {
            require(msg.value >= playFee, "Insufficient payment");
            
            // Send fee to treasury
            (bool success, ) = payable(address(treasury)).call{value: playFee}("");
            require(success, "Fee transfer failed");
            
            // Refund excess
            if (msg.value > playFee) {
                (success, ) = payable(msg.sender).call{value: msg.value - playFee}("");
                require(success, "Refund failed");
            }
        }
        
        // Generate random winning card
        uint8 winningCard = uint8(uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            nextSessionId
        ))) % 3);
        
        bool won = (selectedCard == winningCard);
        
        // Create session
        sessionId = nextSessionId++;
        sessions[sessionId] = GameSession({
            player: msg.sender,
            selectedCard: selectedCard,
            winningCard: winningCard,
            timestamp: uint64(block.timestamp),
            completed: true,
            won: won
        });
        
        player.gamesPlayed++;
        
        uint256 reward = 0;
        if (won) {
            player.gamesWon++;
            reward = winReward;
            
            if (reward > 0) {
                player.totalRewardsEarned += reward;
                treasury.creditReward(msg.sender, treasury.joybitToken(), reward);
            }
        }
        
        emit GameStarted(sessionId, msg.sender, !isFree);
        emit GameCompleted(sessionId, msg.sender, selectedCard, winningCard, won, reward);
        
        return sessionId;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setPlayFee(uint256 _fee) external onlyOwner {
        playFee = _fee;
        emit PlayFeeUpdated(_fee);
    }
    
    function setWinReward(uint256 _reward) external onlyOwner {
        winReward = _reward;
        emit WinRewardUpdated(_reward);
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = ITreasury(_treasury);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function canPlayFree(address player) public view returns (bool) {
        uint64 lastPlay = players[player].lastFreePlayTime;
        return block.timestamp >= lastPlay + 24 hours;
    }
    
    function getPlayerData(address player) external view returns (PlayerData memory) {
        return players[player];
    }
    
    function getSession(uint256 sessionId) external view returns (GameSession memory) {
        return sessions[sessionId];
    }
}
