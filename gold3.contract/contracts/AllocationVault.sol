// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IAllocationVault.sol";

/**
 * @title AllocationVault
 * @notice Holds the full 84M GG supply and releases it once per bucket:
 *         8% initial liquidity, 12% InsuranceTreasury, 80% EmissionController (spec §02).
 * @dev Skeleton: signatures and storage only.
 */
contract AllocationVault is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IAllocationVault {
    uint256 public constant IMPL_REV = 1;

    uint256 public constant INITIAL_LIQUIDITY = 6_720_000 ether;
    uint256 public constant INSURANCE_RESERVE = 10_080_000 ether;
    uint256 public constant EMISSION_BUDGET = 67_200_000 ether;

    bytes32 public constant BUCKET_INITIAL_LIQUIDITY = keccak256("INITIAL_LIQUIDITY");
    bytes32 public constant BUCKET_INSURANCE_RESERVE = keccak256("INSURANCE_RESERVE");
    bytes32 public constant BUCKET_EMISSION_BUDGET = keccak256("EMISSION_BUDGET");

    // ============ Storage ============

    address public gg;
    address public insuranceTreasury;
    address public emissionController;

    mapping(bytes32 => bool) public override isReleased;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address gg_, address insuranceTreasury_, address emissionController_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        gg = gg_;
        insuranceTreasury = insuranceTreasury_;
        emissionController = emissionController_;
    }

    // ============ Release ============

    function releaseInitialLiquidity(address to) external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {}

    function releaseInsuranceReserve() external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {}

    function releaseEmissionBudget() external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {}
}
