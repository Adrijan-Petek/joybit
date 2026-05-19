// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface ITreasuryV4 {
    function USDC() external view returns (address);
    function chargeFromBalance(address player, address token, uint256 amount) external;
    function chargeDirectUSDC(address player, uint256 amount) external;
    function rewardPlayer(address player, address token, uint256 amount) external;
}

contract Match3GameV4 is Ownable, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using SafeERC20 for IERC20;

    ITreasuryV4 public treasury;
    address public signer;

    uint256 public playFee = 500000;
    uint256 public continueFee = 200000;
    uint256 public maxReward = 1_000_000e6;

    uint8 public maxContinues = 2;
    uint256 public sessionDuration = 30 minutes;

    uint256 public nextSessionId = 1;

    uint256 public hammerPrice = 100000;
    uint256 public shufflePrice = 200000;
    uint256 public colorBombPrice = 500000;

    uint256 public hammerPackPrice = 500000;
    uint256 public shufflePackPrice = 1_000_000;
    uint256 public colorBombPackPrice = 2_500_000;

    struct Session {
        address player;
        address token;
        uint64 startTime;
        bool completed;
    }

    mapping(uint256 => Session) public sessions;
    mapping(uint256 => uint8) public continuesUsed;
    mapping(bytes32 => bool) public usedMessages;

    event SignerUpdated(address indexed signer);
    event TreasuryUpdated(address indexed treasury);
    event PlayFeeUpdated(uint256 fee);
    event ContinueFeeUpdated(uint256 fee);
    event MaxRewardUpdated(uint256 amount);
    event SessionConfigUpdated(uint8 maxContinues, uint256 sessionDuration);
    event BoosterPricesUpdated(
        uint256 hammer,
        uint256 shuffle,
        uint256 colorBomb,
        uint256 hammerPack,
        uint256 shufflePack,
        uint256 colorBombPack
    );
    event BoosterPurchased(
        address indexed player,
        uint8 indexed boosterType,
        bool indexed isPack,
        address token,
        bool useDeposit,
        uint256 amount
    );
    event RescueToken(address indexed token, address indexed to, uint256 amount);
    event RescueETH(address indexed to, uint256 amount);

    constructor(address _treasury, address _signer) Ownable(msg.sender) {
        require(_treasury != address(0), "Zero treasury");
        require(_signer != address(0), "Zero signer");
        treasury = ITreasuryV4(_treasury);
        signer = _signer;
    }

    receive() external payable {}

    function startGame(address token, bool useDeposit)
        external
        payable
        whenNotPaused
        returns (uint256 sessionId)
    {
        _validateToken(token);
        _charge(token, useDeposit, playFee);

        sessionId = nextSessionId++;
        sessions[sessionId] = Session({
            player: msg.sender,
            token: token,
            startTime: uint64(block.timestamp),
            completed: false
        });
    }

    function continueLevel(uint256 sessionId, bool useDeposit)
        external
        payable
        whenNotPaused
    {
        Session storage s = sessions[sessionId];

        require(s.player == msg.sender, "Not yours");
        require(!s.completed, "Completed");
        require(block.timestamp <= s.startTime + sessionDuration, "Expired");
        require(continuesUsed[sessionId] < maxContinues, "Max continues");

        _charge(s.token, useDeposit, continueFee);

        continuesUsed[sessionId]++;
        s.startTime = uint64(block.timestamp);
    }

    function completeLevel(
        uint256 sessionId,
        uint256 reward,
        bytes calldata signature
    ) external whenNotPaused {
        require(reward > 0 && reward <= maxReward, "Invalid reward");

        Session storage s = sessions[sessionId];

        require(s.player == msg.sender, "Not yours");
        require(!s.completed, "Completed");
        require(block.timestamp <= s.startTime + sessionDuration, "Expired");

        bytes32 message = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                msg.sender,
                sessionId,
                s.token,
                reward
            )
        ).toEthSignedMessageHash();

        require(!usedMessages[message], "Replay");
        require(message.recover(signature) == signer, "Invalid sig");

        usedMessages[message] = true;
        s.completed = true;

        treasury.rewardPlayer(msg.sender, s.token, reward);
    }

    function buyBooster(
        uint8 boosterType,
        bool isPack,
        address token,
        bool useDeposit
    ) external payable whenNotPaused {
        _validateToken(token);
        uint256 amount = getBoosterPrice(boosterType, isPack);
        _charge(token, useDeposit, amount);

        emit BoosterPurchased(msg.sender, boosterType, isPack, token, useDeposit, amount);
    }

    function getBoosterPrice(uint8 boosterType, bool isPack) public view returns (uint256) {
        if (boosterType == 0) {
            return isPack ? hammerPackPrice : hammerPrice;
        }
        if (boosterType == 1) {
            return isPack ? shufflePackPrice : shufflePrice;
        }
        if (boosterType == 2) {
            return isPack ? colorBombPackPrice : colorBombPrice;
        }

        revert("Invalid booster");
    }

    function _validateToken(address token) internal view {
        require(token == treasury.USDC(), "USDC only");
    }

    function _charge(address token, bool useDeposit, uint256 amount) internal {
        require(amount > 0, "Invalid");
        require(msg.value == 0, "No ETH");

        if (useDeposit) {
            treasury.chargeFromBalance(msg.sender, token, amount);
        } else {
            treasury.chargeDirectUSDC(msg.sender, amount);
        }
    }

    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Zero signer");
        signer = _signer;
        emit SignerUpdated(_signer);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero treasury");
        treasury = ITreasuryV4(_treasury);
        emit TreasuryUpdated(_treasury);
    }

    function setPlayFee(uint256 _fee) external onlyOwner {
        playFee = _fee;
        emit PlayFeeUpdated(_fee);
    }

    function setContinueFee(uint256 _fee) external onlyOwner {
        continueFee = _fee;
        emit ContinueFeeUpdated(_fee);
    }

    function setMaxReward(uint256 _max) external onlyOwner {
        maxReward = _max;
        emit MaxRewardUpdated(_max);
    }

    function setSessionConfig(uint8 _maxContinues, uint256 _sessionDuration) external onlyOwner {
        require(_maxContinues <= 10, "Max too high");
        require(_sessionDuration >= 1 minutes && _sessionDuration <= 2 hours, "Invalid duration");
        maxContinues = _maxContinues;
        sessionDuration = _sessionDuration;
        emit SessionConfigUpdated(_maxContinues, _sessionDuration);
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

        emit BoosterPricesUpdated(
            _hammer,
            _shuffle,
            _colorBomb,
            _hammerPack,
            _shufflePack,
            _colorBombPack
        );
    }

    function rescueToken(address token, address to, uint256 amount)
        external
        onlyOwner
    {
        require(token != address(0), "Zero token");
        require(to != address(0), "Zero to");
        IERC20(token).safeTransfer(to, amount);
        emit RescueToken(token, to, amount);
    }

    function rescueETH(address payable to, uint256 amount)
        external
        onlyOwner
    {
        require(to != address(0), "Zero to");
        require(address(this).balance >= amount, "Low ETH");
        (bool success,) = to.call{value: amount}("");
        require(success, "ETH send failed");
        emit RescueETH(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}