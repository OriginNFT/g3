// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IInsuranceTreasury.sol";

/**
 * @title InsuranceTreasury
 * @notice GG treasury (spec §10): the 10,080,000 GG initial reserve plus every
 *         GG the emission curve left unpaid. Supplies the LP GG dynamic airdrop.
 *         Separate ledger, roles and events from ReserveVault and ProtectionVault.
 * @dev Skeleton: signatures and storage only.
 */
contract InsuranceTreasury is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IInsuranceTreasury {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");
    bytes32 public constant AIRDROP_ROLE = keccak256("AIRDROP_ROLE");

    uint256 public constant INITIAL_RESERVE = 10_080_000 ether;

    bytes32 public constant TAG_INITIAL = keccak256("INITIAL_RESERVE");
    bytes32 public constant TAG_UNUSED_EMISSION = keccak256("UNUSED_EMISSION");

    // ============ Storage ============

    address public gg;

    mapping(bytes32 => uint256) public creditedByTag;
    uint256 public totalCredited;
    uint256 public totalPaid;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address gg_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        gg = gg_;
    }

    // ============ Flows ============

    function credit(uint256 amount, bytes32 sourceTag) external override onlyRole(ROUTER_ROLE) nonReentrant {}

    function supplyAirdrop(address to, uint256 amount) external override onlyRole(AIRDROP_ROLE) nonReentrant {}

    function balance() external view override returns (uint256) {}
}
