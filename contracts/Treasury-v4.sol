// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TreasuryV4 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    address public immutable USDC;

    mapping(address => bool) public authorizedGames;
    mapping(address => mapping(address => uint256)) public balances;
    mapping(address => uint256) public rewardPool;
    mapping(address => uint256) public protocolFees;
    mapping(address => uint256) public totalTokenDistributed;

    uint256 public feePercent = 10;
    uint256 public totalETHCollected;

    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Charged(address indexed user, address indexed token, uint256 amount);
    event RewardPaid(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event AuthorizedGameUpdated(address indexed game, bool status);
    event ProtocolFeeWithdrawn(address indexed token, uint256 amount);
    event FeeUpdated(uint256 percent);
    event RewardPoolFunded(address indexed owner, uint256 amount);
    event RescueToken(address indexed token, address indexed to, uint256 amount);
    event RescueETH(address indexed to, uint256 amount);

    modifier onlyGame() {
        require(authorizedGames[msg.sender], "Unauthorized");
        _;
    }

    constructor(address usdc) Ownable(msg.sender) {
        require(usdc != address(0), "Zero USDC");
        USDC = usdc;
    }

    receive() external payable {}

    function setAuthorizedGame(address game, bool status) external onlyOwner {
        authorizedGames[game] = status;
        emit AuthorizedGameUpdated(game, status);
    }

    function depositUSDC(uint256 amount) external whenNotPaused {
        require(amount > 0, "Invalid");
        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender][USDC] += amount;
        emit Deposit(msg.sender, USDC, amount);
    }

    function fundRewardPool(uint256 amount) external onlyOwner whenNotPaused {
        require(amount > 0, "Invalid");
        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amount);
        rewardPool[USDC] += amount;
        emit RewardPoolFunded(msg.sender, amount);
    }

    function _validateToken(address token) internal view {
        require(token == USDC, "USDC only");
    }

    function chargeFromBalance(address player, address token, uint256 amount)
        external
        onlyGame
        whenNotPaused
    {
        _validateToken(token);
        require(amount > 0, "Invalid");
        require(balances[player][USDC] >= amount, "Low balance");

        balances[player][USDC] -= amount;
        _split(amount);

        emit Charged(player, USDC, amount);
    }

    function chargeDirectUSDC(address player, uint256 amount)
        external
        onlyGame
        whenNotPaused
    {
        require(amount > 0, "Invalid");
        IERC20(USDC).safeTransferFrom(player, address(this), amount);
        _split(amount);
        emit Charged(player, USDC, amount);
    }

    function _split(uint256 amount) internal {
        uint256 fee = (amount * feePercent) / 100;
        protocolFees[USDC] += fee;
        rewardPool[USDC] += (amount - fee);
    }

    function rewardPlayer(address player, address token, uint256 amount)
        external
        onlyGame
        whenNotPaused
    {
        _validateToken(token);
        require(amount > 0, "Invalid");
        require(rewardPool[USDC] >= amount, "Low pool");

        rewardPool[USDC] -= amount;
        balances[player][USDC] += amount;
        totalTokenDistributed[USDC] += amount;

        emit RewardPaid(player, USDC, amount);
    }

    function withdraw(address token, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        _validateToken(token);
        require(amount > 0, "Invalid");
        require(balances[msg.sender][USDC] >= amount, "Low balance");

        balances[msg.sender][USDC] -= amount;
        IERC20(USDC).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, USDC, amount);
    }

    function claimToken(address token) external nonReentrant whenNotPaused {
        _claimToken(msg.sender, token);
    }

    function claimAllTokens() external nonReentrant whenNotPaused {
        _claimToken(msg.sender, USDC);
    }

    function _claimToken(address player, address token) internal {
        _validateToken(token);
        uint256 amount = balances[player][USDC];
        require(amount > 0, "Low balance");

        balances[player][USDC] = 0;
        IERC20(USDC).safeTransfer(player, amount);

        emit Withdraw(player, USDC, amount);
    }

    function withdrawProtocolFees(address token, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        _validateToken(token);
        require(amount > 0, "Invalid");
        require(protocolFees[USDC] >= amount, "Low");

        protocolFees[USDC] -= amount;
        IERC20(USDC).safeTransfer(owner(), amount);

        emit ProtocolFeeWithdrawn(USDC, amount);
    }

    function setFeePercent(uint256 percent) external onlyOwner {
        require(percent <= 25, "Too high");
        feePercent = percent;
        emit FeeUpdated(percent);
    }

    function getPendingRewards(address player, address token) external view returns (uint256) {
        _validateToken(token);
        return balances[player][USDC];
    }

    function getAllPendingRewards(address player)
        external
        view
        returns (address[] memory tokens, uint256[] memory amounts)
    {
        uint256 amount = balances[player][USDC];
        if (amount == 0) {
            return (new address[](0), new uint256[](0));
        }

        tokens = new address[](1);
        amounts = new uint256[](1);
        tokens[0] = USDC;
        amounts[0] = amount;
    }

    function getSupportedTokens() external view returns (address[] memory tokens) {
        tokens = new address[](1);
        tokens[0] = USDC;
    }

    function treasuryBalanceETH() external view returns (uint256) {
        return address(this).balance;
    }

    function treasuryBalanceToken(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function rescueToken(address token, address to, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(token != address(0), "Zero token");
        require(token != USDC, "Use USDC flows");
        require(to != address(0), "Zero to");

        IERC20(token).safeTransfer(to, amount);
        emit RescueToken(token, to, amount);
    }

    function rescueETH(address payable to, uint256 amount)
        external
        onlyOwner
        nonReentrant
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