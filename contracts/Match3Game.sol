// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITreasury {
    function creditReward(address player, address token, uint256 amount) external;
    function joybitToken() external view returns (address);
}

/**
 * @title Match3Game
 * @notice Match-3 game with free daily play, adjustable fees, boosters, and level-based rewards
 */
contract Match3Game is Ownable, ReentrancyGuard {
    ITreasury public treasury;
    
    // Game fees
    uint256 public playFee = 0.001 ether;
    
    // Booster prices (single)
    uint256 public hammerPrice = 0.0001 ether;
    uint256 public shufflePrice = 0.0002 ether;
    uint256 public colorBombPrice = 0.0003 ether;
    
    // Booster pack prices (x5)
    uint256 public hammerPackPrice = 0.0004 ether;
    uint256 public shufflePackPrice = 0.0008 ether;
    uint256 public colorBombPackPrice = 0.0012 ether;
    
    // Level rewards (JOYB) - up to 1000 levels
    mapping(uint16 => uint256) public levelRewards;
    
    // Player data
    struct PlayerData {
        uint64 lastFreePlayTime;
        uint32 gamesPlayed;
        uint32 gamesWon;
        // Boosters inventory
        uint16 hammers;
        uint16 shuffles;
        uint16 colorBombs;
    }
    
    mapping(address => PlayerData) public players;
    
    // Game session tracking
    struct GameSession {
        address player;        // 20 bytes
        uint64 startTime;      // 8 bytes
        uint16 level;          // 2 bytes
        bool active;           // 1 byte
    }
    
    mapping(uint256 => GameSession) public sessions;
    uint256 public nextSessionId = 1;
    
    event GameStarted(uint256 indexed sessionId, address indexed player, uint16 level, bool isPaid);
    event BoosterPurchased(address indexed player, string boosterType, uint16 quantity, uint256 price);
    event BoosterUsed(address indexed player, string boosterType);
    event PlayFeeUpdated(uint256 newFee);
    event BoosterPricesUpdated(uint256 hammer, uint256 shuffle, uint256 colorBomb, uint256 hammerPack, uint256 shufflePack, uint256 colorBombPack);
    event LevelRewardUpdated(uint16 level, uint256 reward);
    
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = ITreasury(_treasury);
        
        // Level rewards set by admin via setLevelReward()
        // Default: no rewards until configured
    }
    
    // ============ GAME PLAY ============
    
    /**
     * @notice Start a game session (free if within 24h cooldown, otherwise paid)
     */
    function startGame(uint8 level) external payable nonReentrant returns (uint256 sessionId) {
        require(level >= 1 && level <= 10, "Invalid level");
        
        PlayerData storage player = players[msg.sender];
        bool isFree = canPlayFree(msg.sender);
        
        if (isFree) {
            // Free play
            require(msg.value == 0, "Free play - no payment");
            player.lastFreePlayTime = uint64(block.timestamp);
        } else {
            // Paid play
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
        
        // Create session
        sessionId = nextSessionId++;
        sessions[sessionId] = GameSession({
            player: msg.sender,
            level: level,
            startTime: uint64(block.timestamp),
            active: true
        });
        
        player.gamesPlayed++;
        
        emit GameStarted(sessionId, msg.sender, level, !isFree);
        return sessionId;
    }
    
    // ============ BOOSTERS ============
    
    /**
     * @notice Buy single hammer booster
     */
    function buyHammer() external payable nonReentrant {
        require(msg.value >= hammerPrice, "Insufficient payment");
        
        players[msg.sender].hammers++;
        
        _sendToTreasury(hammerPrice);
        _refundExcess(hammerPrice);
        
        emit BoosterPurchased(msg.sender, "hammer", 1, hammerPrice);
    }
    
    /**
     * @notice Buy single shuffle booster
     */
    function buyShuffle() external payable nonReentrant {
        require(msg.value >= shufflePrice, "Insufficient payment");
        
        players[msg.sender].shuffles++;
        
        _sendToTreasury(shufflePrice);
        _refundExcess(shufflePrice);
        
        emit BoosterPurchased(msg.sender, "shuffle", 1, shufflePrice);
    }
    
    /**
     * @notice Buy single color bomb booster
     */
    function buyColorBomb() external payable nonReentrant {
        require(msg.value >= colorBombPrice, "Insufficient payment");
        
        players[msg.sender].colorBombs++;
        
        _sendToTreasury(colorBombPrice);
        _refundExcess(colorBombPrice);
        
        emit BoosterPurchased(msg.sender, "colorBomb", 1, colorBombPrice);
    }
    
    /**
     * @notice Buy hammer pack (x5)
     */
    function buyHammerPack() external payable nonReentrant {
        require(msg.value >= hammerPackPrice, "Insufficient payment");
        
        players[msg.sender].hammers += 5;
        
        _sendToTreasury(hammerPackPrice);
        _refundExcess(hammerPackPrice);
        
        emit BoosterPurchased(msg.sender, "hammerPack", 5, hammerPackPrice);
    }
    
    /**
     * @notice Buy shuffle pack (x5)
     */
    function buyShufflePack() external payable nonReentrant {
        require(msg.value >= shufflePackPrice, "Insufficient payment");
        
        players[msg.sender].shuffles += 5;
        
        _sendToTreasury(shufflePackPrice);
        _refundExcess(shufflePackPrice);
        
        emit BoosterPurchased(msg.sender, "shufflePack", 5, shufflePackPrice);
    }
    
    /**
     * @notice Buy color bomb pack (x5)
     */
    function buyColorBombPack() external payable nonReentrant {
        require(msg.value >= colorBombPackPrice, "Insufficient payment");
        
        players[msg.sender].colorBombs += 5;
        
        _sendToTreasury(colorBombPackPrice);
        _refundExcess(colorBombPackPrice);
        
        emit BoosterPurchased(msg.sender, "colorBombPack", 5, colorBombPackPrice);
    }
    
    /**
     * @notice Use a booster (called by frontend when player uses it)
     */
    function useBooster(string calldata boosterType) external {
        PlayerData storage player = players[msg.sender];
        
        if (keccak256(bytes(boosterType)) == keccak256(bytes("hammer"))) {
            require(player.hammers > 0, "No hammers");
            player.hammers--;
        } else if (keccak256(bytes(boosterType)) == keccak256(bytes("shuffle"))) {
            require(player.shuffles > 0, "No shuffles");
            player.shuffles--;
        } else if (keccak256(bytes(boosterType)) == keccak256(bytes("colorBomb"))) {
            require(player.colorBombs > 0, "No color bombs");
            player.colorBombs--;
        } else {
            revert("Invalid booster");
        }
        
        emit BoosterUsed(msg.sender, boosterType);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setPlayFee(uint256 _fee) external onlyOwner {
        playFee = _fee;
        emit PlayFeeUpdated(_fee);
    }
    
    function setBoosterPrices(
        uint256 _hammer,
        uint256 _shuffle,
        uint256 _colorBomb,
        uint256 _hammerPack,
        uint256 _shufflePack,
        uint256 _colorBombPack
    ) external onlyOwner {
        hammerPrice = _hammer;
        shufflePrice = _shuffle;
        colorBombPrice = _colorBomb;
        hammerPackPrice = _hammerPack;
        shufflePackPrice = _shufflePack;
        colorBombPackPrice = _colorBombPack;
        
        emit BoosterPricesUpdated(_hammer, _shuffle, _colorBomb, _hammerPack, _shufflePack, _colorBombPack);
    }
    
    function setLevelReward(uint16 level, uint256 reward) external onlyOwner {
        require(level >= 1 && level <= 1000, "Invalid level");
        levelRewards[level] = reward;
        emit LevelRewardUpdated(level, reward);
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
    
    function getBoosterInventory(address player) external view returns (uint16 hammers, uint16 shuffles, uint16 colorBombs) {
        PlayerData memory data = players[player];
        return (data.hammers, data.shuffles, data.colorBombs);
    }
    
    // ============ INTERNAL ============
    
    function _sendToTreasury(uint256 amount) internal {
        (bool success, ) = payable(address(treasury)).call{value: amount}("");
        require(success, "Treasury transfer failed");
    }
    
    function _refundExcess(uint256 price) internal {
        if (msg.value > price) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(success, "Refund failed");
        }
    }
}
