// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AchievementNFT
 * @dev Gas-optimized ERC721 contract for minting achievement NFTs in the Joybit gaming platform
 * Security-first design with comprehensive access controls and reentrancy protection
 */
contract AchievementNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    // Use uint256 for counter - simple and gas efficient
    uint256 private _tokenIdCounter;

    // Treasury contract address - immutable for gas savings
    address public immutable treasury;

    // Achievement rarity levels - optimized enum
    enum Rarity { Common, Rare, Epic, Legendary, Mythic }

    // Optimized Achievement struct - packed for gas efficiency
    struct Achievement {
        uint8 rarity;     // 0-4 (Rarity enum)
        bool active;      // 1 byte
        uint240 price;    // 240 bits (max ~1e36 ETH)
    }

    // Separate mappings for string data to reduce struct size and gas costs
    mapping(string => string) private _achievementNames;
    mapping(string => string) private _achievementDescriptions;
    mapping(string => string) private _achievementEmojis;
    mapping(string => string) private _achievementMetadataUrls;

    // Core mappings - optimized for gas
    mapping(string => Achievement) private _achievements;
    mapping(uint256 => string) private _tokenAchievements;
    mapping(address => mapping(string => uint256)) private _userAchievements;

    // Achievement enumeration - optimized array
    string[] private _achievementIds;

    // Efficient user achievement counter - O(1) access
    mapping(address => uint256) private _userAchievementCount;

    // User token enumeration for efficient getUserAchievements
    mapping(address => uint256[]) private _userTokens;

    // Events - optimized with indexed parameters
    event AchievementMinted(address indexed user, uint256 indexed tokenId, string indexed achievementId, uint256 price);
    event AchievementAdded(string indexed id, string name, uint8 rarity, uint256 price);
    event AchievementUpdated(string indexed id, uint256 newPrice, bool active);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /**
     * @dev Constructor - immutable treasury for gas savings
     */
    constructor(address _treasury) ERC721("Joybit Achievement", "JOYACH") Ownable(msg.sender) {
        require(_treasury != address(0), "Treasury address cannot be zero");
        treasury = _treasury;
    }

    /**
     * @dev Add achievement - optimized for gas with packed struct
     */
    function addAchievement(
        string calldata id,
        string calldata name,
        string calldata description,
        uint8 rarity,
        string calldata emoji,
        string calldata metadataUrl,
        uint256 price
    ) external onlyOwner {
        require(bytes(id).length > 0 && bytes(id).length <= 32, "Invalid ID length");
        require(bytes(name).length > 0, "Name required");
        require(bytes(metadataUrl).length > 0, "URL required");
        require(_achievements[id].active == false, "Achievement exists");
        require(rarity <= uint8(Rarity.Mythic), "Invalid rarity");
        require(price > 0, "Price must be > 0");

        _achievements[id] = Achievement({
            rarity: rarity,
            active: true,
            price: uint240(price)
        });

        _achievementNames[id] = name;
        _achievementDescriptions[id] = description;
        _achievementEmojis[id] = emoji;
        _achievementMetadataUrls[id] = metadataUrl;
        _achievementIds.push(id);

        emit AchievementAdded(id, name, rarity, price);
    }

    /**
     * @dev Mint achievement - optimized for gas efficiency with enhanced security
     */
    function mintAchievement(string calldata achievementId) external payable nonReentrant {
        Achievement memory achievement = _achievements[achievementId];
        require(achievement.active, "Achievement not found");
        require(msg.value >= achievement.price, "Insufficient payment");
        require(_userAchievements[msg.sender][achievementId] == 0, "Already minted");

        uint256 tokenId = _tokenIdCounter++;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _achievementMetadataUrls[achievementId]);

        _tokenAchievements[tokenId] = achievementId;
        _userAchievements[msg.sender][achievementId] = tokenId;
        _userAchievementCount[msg.sender]++;
        _userTokens[msg.sender].push(tokenId);

        // Secure ETH transfer with gas limit
        (bool success,) = treasury.call{value: msg.value, gas: 2300}("");
        require(success, "Treasury transfer failed");

        emit AchievementMinted(msg.sender, tokenId, achievementId, msg.value);
    }

    /**
     * @dev Get achievement details - optimized view with packed data
     */
    function getAchievement(string calldata achievementId) external view returns (
        string memory id,
        string memory name,
        string memory description,
        uint8 rarity,
        string memory emoji,
        string memory metadataUrl,
        uint256 price,
        bool active
    ) {
        Achievement memory achievement = _achievements[achievementId];
        return (
            achievementId,
            _achievementNames[achievementId],
            _achievementDescriptions[achievementId],
            achievement.rarity,
            _achievementEmojis[achievementId],
            _achievementMetadataUrls[achievementId],
            uint256(achievement.price),
            achievement.active
        );
    }

    /**
     * @dev Get all achievement IDs
     */
    function getAllAchievementIds() external view returns (string[] memory) {
        return _achievementIds;
    }

    /**
     * @dev Get user's achievement count - O(1)
     */
    function getUserAchievementCount(address user) external view returns (uint256) {
        return _userAchievementCount[user];
    }

    /**
     * @dev Check if user has achievement - O(1)
     */
    function hasAchievement(address user, string calldata achievementId) external view returns (bool) {
        return _userAchievements[user][achievementId] != 0;
    }

    /**
     * @dev Get user's achievements - O(1) with pre-computed array
     */
    function getUserAchievements(address user) external view returns (uint256[] memory) {
        return _userTokens[user];
    }

    /**
     * @dev Update achievement - secure admin function
     */
    function updateAchievement(
        string calldata id,
        uint256 newPrice,
        bool active
    ) external onlyOwner {
        Achievement storage achievement = _achievements[id];
        require(achievement.active || active, "Achievement not found");
        require(newPrice > 0, "Price must be > 0");
        require(newPrice <= type(uint240).max, "Price too high");

        achievement.price = uint240(newPrice);
        achievement.active = active;
        emit AchievementUpdated(id, newPrice, active);
    }

    /**
     * @dev Emergency withdraw - only owner can withdraw stuck ETH
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool success,) = payable(owner()).call{value: balance, gas: 2300}("");
        require(success, "Transfer failed");
    }

    // ============ PUBLIC GETTERS FOR BACKWARD COMPATIBILITY ============

    /**
     * @dev Public getters for achievement data (backward compatibility)
     */
    function achievementNames(string calldata id) external view returns (string memory) {
        return _achievementNames[id];
    }

    function achievementDescriptions(string calldata id) external view returns (string memory) {
        return _achievementDescriptions[id];
    }

    function achievementEmojis(string calldata id) external view returns (string memory) {
        return _achievementEmojis[id];
    }

    function achievements(string calldata id) external view returns (uint8 rarity, bool active, uint256 price) {
        Achievement memory achievement = _achievements[id];
        return (achievement.rarity, achievement.active, uint256(achievement.price));
    }

    function tokenAchievements(uint256 tokenId) external view returns (string memory) {
        return _tokenAchievements[tokenId];
    }

    function userAchievements(address user, string calldata achievementId) external view returns (uint256) {
        return _userAchievements[user][achievementId];
    }

    function userAchievementCount(address user) external view returns (uint256) {
        return _userAchievementCount[user];
    }

    function achievementIds(uint256 index) external view returns (string memory) {
        return _achievementIds[index];
    }

    function getAchievementCount() external view returns (uint256) {
        return _achievementIds.length;
    }

    // ERC721 overrides
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage) returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}