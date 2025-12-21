// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Simple ERC20 token for testing purposes
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock JOYB", "mJOYB") {
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}