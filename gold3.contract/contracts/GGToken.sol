// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";

/**
 * @title GGToken
 * @notice Fixed supply of 84,000,000 GG, minted once to AllocationVault at
 *         initialize. There is no mint function: emission releases pre-minted
 *         GG, it never mints (spec §02).
 */
contract GGToken is ERC20BurnableUpgradeable {
    uint256 public constant IMPL_REV = 1;

    uint256 public constant TOTAL_SUPPLY = 84_000_000 ether;

    /// @dev Reserved storage for future upgrades (append new vars above, shrink this).
    uint256[50] private __gap;

    function initialize(string memory name_, string memory symbol_, address allocationVault_) external initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        _mint(allocationVault_, TOTAL_SUPPLY);
    }
}
