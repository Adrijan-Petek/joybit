// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Treasury
 * @notice Multi-token treasury - collects ETH fees, manages rewards for multiple tokens
 */
contract Treasury is Ownable, ReentrancyGuard {
    IERC20 public joybitToken; // Primary token (JOYB)
    
    // Admin management
    mapping(address => bool) public isAdmin;
    
    // Multi-token rewards: pendingRewards[player][token] = amount
    mapping(address => mapping(address => uint256)) public pendingRewards;
    
    // Supported tokens for rewards
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;
    
    // Minimum balance required before allowing claims (per token)
    mapping(address => uint256) public minimumTokenBalance;
    
    // Stats
    uint256 public totalETHCollected;
    mapping(address => uint256) public totalTokenDistributed;
    
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event ETHReceived(address indexed from, uint256 amount);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event RewardCredited(address indexed player, address indexed token, uint256 amount);
    event RewardClaimed(address indexed player, address indexed token, uint256 amount);
    event BatchRewardsDistributed(address indexed token, uint256 playerCount, uint256 totalAmount);
    event MinimumBalanceUpdated(address indexed token, uint256 newMinimum);
    
    modifier onlyAdminOrOwner() {
        require(msg.sender == owner() || isAdmin[msg.sender], "Not admin or owner");
        _;
    }
    
    constructor(address _joybitToken) Ownable(msg.sender) {
        require(_joybitToken != address(0), "Invalid token");
        joybitToken = IERC20(_joybitToken);
        
        // Add JOYB as default supported token
        supportedTokens[_joybitToken] = true;
        tokenList.push(_joybitToken);
        minimumTokenBalance[_joybitToken] = 1000000 ether; // 1M JOYB default
        
        emit TokenAdded(_joybitToken);
    }
    
    // ============ ADMIN MANAGEMENT ============
    
    function addAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid address");
        require(!isAdmin[_admin], "Already admin");
        isAdmin[_admin] = true;
        emit AdminAdded(_admin);
    }
    
    function removeAdmin(address _admin) external onlyOwner {
        require(isAdmin[_admin], "Not an admin");
        isAdmin[_admin] = false;
        emit AdminRemoved(_admin);
    }
    
    // ============ TOKEN MANAGEMENT ============
    
    /**
     * @notice Add a new token for reward distribution
     */
    function addSupportedToken(address token, uint256 minimumBalance) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!supportedTokens[token], "Already supported");
        
        supportedTokens[token] = true;
        tokenList.push(token);
        minimumTokenBalance[token] = minimumBalance;
        
        emit TokenAdded(token);
    }
    
    /**
     * @notice Remove a token from supported list
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Not supported");
        require(token != address(joybitToken), "Cannot remove JOYB");
        
        supportedTokens[token] = false;
        
        // Remove from array
        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        
        emit TokenRemoved(token);
    }
    
    /**
     * @notice Get all supported tokens
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }
    
    // ============ REWARD MANAGEMENT (MULTI-TOKEN) ============
    
    /**
     * @notice Credit rewards to player for ANY supported token
     */
    function creditReward(
        address player,
        address token,
        uint256 amount
    ) external onlyAdminOrOwner {
        require(player != address(0), "Invalid player");
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Invalid amount");
        
        pendingRewards[player][token] += amount;
        emit RewardCredited(player, token, amount);
    }
    
    /**
     * @notice Player claims reward for specific token
     */
    function claimToken(address token) external nonReentrant {
        require(supportedTokens[token], "Token not supported");
        
        uint256 amount = pendingRewards[msg.sender][token];
        require(amount > 0, "No rewards");
        
        uint256 treasuryBalance = IERC20(token).balanceOf(address(this));
        require(treasuryBalance >= minimumTokenBalance[token], "Treasury low on tokens");
        
        pendingRewards[msg.sender][token] = 0;
        totalTokenDistributed[token] += amount;
        
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        emit RewardClaimed(msg.sender, token, amount);
    }
    
    /**
     * @notice Player claims all pending rewards (all tokens)
     */
    function claimAllTokens() external nonReentrant {
        bool claimed = false;
        
        for (uint256 i = 0; i < tokenList.length; i++) {
            address token = tokenList[i];
            uint256 amount = pendingRewards[msg.sender][token];
            
            if (amount > 0) {
                uint256 treasuryBalance = IERC20(token).balanceOf(address(this));
                
                if (treasuryBalance >= minimumTokenBalance[token]) {
                    pendingRewards[msg.sender][token] = 0;
                    totalTokenDistributed[token] += amount;
                    
                    require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
                    emit RewardClaimed(msg.sender, token, amount);
                    claimed = true;
                }
            }
        }
        
        require(claimed, "No rewards to claim");
    }
    
    /**
     * @notice Batch distribute rewards for specific token
     */
    function batchDistributeRewards(
        address token,
        address[] calldata players,
        uint256[] calldata amounts
    ) external onlyAdminOrOwner nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(players.length == amounts.length, "Length mismatch");
        require(players.length > 0, "Empty arrays");
        
        uint256 totalAmount;
        unchecked {
            for (uint256 i = 0; i < amounts.length; i++) {
                totalAmount += amounts[i];
            }
        }
        
        require(IERC20(token).balanceOf(address(this)) >= totalAmount, "Insufficient tokens");
        
        unchecked {
            for (uint256 i = 0; i < players.length; i++) {
                require(players[i] != address(0), "Invalid player");
                if (amounts[i] == 0) continue;
                
                require(IERC20(token).transfer(players[i], amounts[i]), "Transfer failed");
                totalTokenDistributed[token] += amounts[i];
            }
        }
        
        emit BatchRewardsDistributed(token, players.length, totalAmount);
    }
    
    // ============ WITHDRAWAL FUNCTIONS ============
    
    /**
     * @notice Withdraw collected ETH fees
     */
    function withdrawETH(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Invalid amount");
        require(address(this).balance >= amount, "Insufficient ETH");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit ETHWithdrawn(owner(), amount);
    }
    
    /**
     * @notice Withdraw any supported token
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Invalid amount");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient tokens");
        
        require(IERC20(token).transfer(owner(), amount), "Transfer failed");
    }
    
    /**
     * @notice Emergency withdraw all ETH
     */
    function emergencyWithdrawETH() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit ETHWithdrawn(owner(), balance);
    }
    
    // ============ CONFIGURATION ============
    
    function setMinimumTokenBalance(address token, uint256 _minimum) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        minimumTokenBalance[token] = _minimum;
        emit MinimumBalanceUpdated(token, _minimum);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function treasuryBalanceETH() external view returns (uint256) {
        return address(this).balance;
    }
    
    function treasuryBalanceToken(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    function getPendingRewards(address player, address token) external view returns (uint256) {
        return pendingRewards[player][token];
    }
    
    function getAllPendingRewards(address player) external view returns (address[] memory tokens, uint256[] memory amounts) {
        tokens = new address[](tokenList.length);
        amounts = new uint256[](tokenList.length);
        
        for (uint256 i = 0; i < tokenList.length; i++) {
            tokens[i] = tokenList[i];
            amounts[i] = pendingRewards[player][tokenList[i]];
        }
        
        return (tokens, amounts);
    }
    
    // ============ RECEIVE ETH ============
    
    receive() external payable {
        totalETHCollected += msg.value;
        emit ETHReceived(msg.sender, msg.value);
    }
}
