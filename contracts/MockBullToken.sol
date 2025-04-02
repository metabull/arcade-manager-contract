// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockBullToken
 * @dev Mock implementation of the BULL token for testing purposes
 */
contract MockBullToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Bull Token", "BULL") {
        _mint(msg.sender, initialSupply);
    }
}