// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice GG as the protocol contracts consume it: a burnable ERC20.
interface IGGToken is IERC20 {
    function burn(uint256 value) external;

    function burnFrom(address account, uint256 value) external;
}
