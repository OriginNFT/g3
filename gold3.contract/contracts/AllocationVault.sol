// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interface/IAllocationVault.sol";
import "./interface/IInsuranceTreasury.sol";

/**
 * @title AllocationVault
 * @notice Holds the full 84M GG supply and releases it once per bucket:
 *         8% initial liquidity, 12% InsuranceTreasury, 80% EmissionController (spec §02).
 * @dev Each bucket releases exactly once, admin only. The initial liquidity
 *      goes to the admin's chosen address, the insurance reserve is
 *      pull-deposited into the InsuranceTreasury under its TAG_INITIAL (this
 *      vault must hold the treasury's ROUTER_ROLE), the emission budget is
 *      transferred to the EmissionController.
 *
 *      Upgradeable (Transparent proxy). Roles: DEFAULT_ADMIN_ROLE (release).
 */
contract AllocationVault is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IAllocationVault {
    using SafeERC20 for IERC20;

    uint256 public constant IMPL_REV = 1;

    uint256 public constant INITIAL_LIQUIDITY = 6_720_000 ether;
    uint256 public constant INSURANCE_RESERVE = 10_080_000 ether;
    uint256 public constant EMISSION_BUDGET = 67_200_000 ether;

    bytes32 public constant BUCKET_INITIAL_LIQUIDITY = keccak256("INITIAL_LIQUIDITY");
    bytes32 public constant BUCKET_INSURANCE_RESERVE = keccak256("INSURANCE_RESERVE");
    bytes32 public constant BUCKET_EMISSION_BUDGET = keccak256("EMISSION_BUDGET");

    /// @dev Must equal InsuranceTreasury.TAG_INITIAL.
    bytes32 private constant TREASURY_TAG_INITIAL = keccak256("INITIAL_RESERVE");

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

        require(gg_ != address(0), "AllocationVault: zero gg");
        require(insuranceTreasury_ != address(0), "AllocationVault: zero treasury");
        require(emissionController_ != address(0), "AllocationVault: zero emission controller");

        gg = gg_;
        insuranceTreasury = insuranceTreasury_;
        emissionController = emissionController_;
    }

    // ============ Release ============

    /// @notice Transfer the 8% initial liquidity to `to`. Once, admin only.
    function releaseInitialLiquidity(address to) external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(to != address(0), "AllocationVault: zero recipient");
        _markReleased(BUCKET_INITIAL_LIQUIDITY);

        IERC20(gg).safeTransfer(to, INITIAL_LIQUIDITY);

        emit AllocationReleased(BUCKET_INITIAL_LIQUIDITY, to, INITIAL_LIQUIDITY);
    }

    /// @notice Credit the 12% insurance reserve into the InsuranceTreasury under
    ///         its TAG_INITIAL. Once, admin only.
    function releaseInsuranceReserve() external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        _markReleased(BUCKET_INSURANCE_RESERVE);

        IERC20(gg).forceApprove(insuranceTreasury, INSURANCE_RESERVE);
        IInsuranceTreasury(insuranceTreasury).credit(INSURANCE_RESERVE, TREASURY_TAG_INITIAL);
        IERC20(gg).forceApprove(insuranceTreasury, 0);

        emit AllocationReleased(BUCKET_INSURANCE_RESERVE, insuranceTreasury, INSURANCE_RESERVE);
    }

    /// @notice Transfer the 80% emission budget to the EmissionController. Once, admin only.
    function releaseEmissionBudget() external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        _markReleased(BUCKET_EMISSION_BUDGET);

        IERC20(gg).safeTransfer(emissionController, EMISSION_BUDGET);

        emit AllocationReleased(BUCKET_EMISSION_BUDGET, emissionController, EMISSION_BUDGET);
    }

    function _markReleased(bytes32 bucket) internal {
        require(!isReleased[bucket], "AllocationVault: already released");
        isReleased[bucket] = true;
    }
}
