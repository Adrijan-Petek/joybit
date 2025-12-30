// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AchievementERC1155 (Optimized)
 * @dev Ultra-gas-optimized, soulbound ERC1155 achievements for Joybit
 */
contract AchievementERC1155 is ERC1155, Ownable {
    using Strings for uint256;

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Treasury address (immutable = cheaper reads)
    address public immutable treasury;

    /// @notice Base metadata URI (ipfs://CID/)
    string public baseMetadataURI;

    /// @notice Rarity levels
    enum Rarity { Common, Rare, Epic, Legendary, Mythic }

    /// @notice Minimal achievement storage
    struct Achievement {
        uint8 rarity;      // enum index
        bool active;       // enabled/disabled
        uint240 price;     // mint price in wei
    }

    /// @notice achievementId => Achievement
    mapping(uint256 => Achievement) public achievements;

    /// @notice user => achievementId => claimed
    mapping(address => mapping(uint256 => bool)) public claimed;

    /// @notice achievement existence tracking
    mapping(uint256 => bool) private _achievementExists;
    uint256[] private _achievementIds;

    /// @notice backend minters
    mapping(address => bool) public authorizedMinters;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AchievementAdded(uint256 indexed id, uint8 rarity, uint256 price);
    event AchievementUpdated(uint256 indexed id, uint256 price, bool active);
    event AchievementMinted(address indexed user, uint256 indexed id, uint256 price);
    event MinterUpdated(address indexed minter, bool allowed);

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyMinter() {
        require(
            authorizedMinters[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _treasury,
        string memory _baseMetadataURI
    ) ERC1155("") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        baseMetadataURI = _baseMetadataURI;
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setMinter(address minter, bool allowed) external onlyOwner {
        authorizedMinters[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    function addAchievement(
        uint256 id,
        uint8 rarity,
        uint256 price
    ) external onlyOwner {
        require(!_achievementExists[id], "Exists");
        require(rarity <= uint8(Rarity.Mythic), "Invalid rarity");
        require(price > 0 && price <= type(uint240).max, "Invalid price");

        achievements[id] = Achievement({
            rarity: rarity,
            active: true,
            price: uint240(price)
        });

        _achievementExists[id] = true;
        _achievementIds.push(id);

        emit AchievementAdded(id, rarity, price);
    }

    function updateAchievement(
        uint256 id,
        uint256 newPrice,
        bool active
    ) external onlyOwner {
        require(_achievementExists[id], "Not found");
        require(newPrice > 0 && newPrice <= type(uint240).max, "Invalid price");

        Achievement storage achievement = achievements[id];
        achievement.price = uint240(newPrice);
        achievement.active = active;

        emit AchievementUpdated(id, newPrice, active);
    }

    /*//////////////////////////////////////////////////////////////
                            MINTING LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @notice User-paid mint
    function mintAchievement(uint256 achievementId) external payable {
        Achievement storage achievement = achievements[achievementId];

        require(achievement.active, "Inactive");
        require(!claimed[msg.sender][achievementId], "Already claimed");
        require(msg.value >= achievement.price, "Insufficient payment");

        claimed[msg.sender][achievementId] = true;

        _mint(msg.sender, achievementId, 1, "");

        (bool success, ) = payable(treasury).call{value: msg.value}("");
        require(success, "Transfer failed");

        emit AchievementMinted(msg.sender, achievementId, msg.value);
    }

    /// @notice Backend-controlled mint (gasless for user)
    function backendMint(address user, uint256 achievementId)
        external
        onlyMinter
    {
        Achievement storage achievement = achievements[achievementId];

        require(achievement.active, "Inactive");
        require(!claimed[user][achievementId], "Already claimed");

        claimed[user][achievementId] = true;

        _mint(user, achievementId, 1, "");

        emit AchievementMinted(user, achievementId, 0);
    }

    /*//////////////////////////////////////////////////////////////
                            METADATA
    //////////////////////////////////////////////////////////////*/

    /// @notice ipfs://CID/{id}.json
    function uri(uint256 id) public view override returns (string memory) {
        require(_achievementExists[id], "Invalid ID");
        return string.concat(baseMetadataURI, id.toString(), ".json");
    }

    /*//////////////////////////////////////////////////////////////
                        SOULBOUND ENFORCEMENT
    //////////////////////////////////////////////////////////////*/

    // Override transfer functions to make achievements non-transferable
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override {
        revert("Soulbound: non-transferable");
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override {
        revert("Soulbound: non-transferable");
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getAchievement(uint256 id)
        external
        view
        returns (
            uint8 rarity,
            uint256 price,
            bool active
        )
    {
        Achievement storage achievement = achievements[id];
        return (
            achievement.rarity,
            uint256(achievement.price),
            achievement.active
        );
    }

    function getAllAchievementIds() external view returns (uint256[] memory) {
        return _achievementIds;
    }

    function hasAchievement(address user, uint256 id)
        external
        view
        returns (bool)
    {
        return claimed[user][id];
    }

    function getAchievementCount() external view returns (uint256) {
        return _achievementIds.length;
    }
}
