// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interface/IInsuranceTreasury.sol";

/**
 * @title InsuranceTreasury
 * @notice GG treasury (spec §10): the 10,080,000 GG initial reserve plus every
 *         GG the emission curve left unpaid. Supplies the LP GG dynamic airdrop.
 *         Separate ledger, roles and events from ReserveVault and ProtectionVault.
 * @dev Inflows are pull-deposits by ROUTER_ROLE holders (AllocationVault for
 *      the initial reserve under TAG_INITIAL, EmissionController for the
 *      unused emission under TAG_UNUSED_EMISSION), each booked under the
 *      caller's source tag. Outflows are supplyAirdrop() by AIRDROP_ROLE
 *      (LPStakeVault). creditedByTag attributes what came in, not what
 *      remains: the live holding is balance().
 *
 *      Upgradeable (Transparent proxy). Roles: DEFAULT_ADMIN_ROLE (role
 *      management), ROUTER_ROLE (credit), AIRDROP_ROLE (supplyAirdrop).
 */
contract InsuranceTreasury is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IInsuranceTreasury {
    using SafeERC20 for IERC20;

    uint256 public constant IMPL_REV = 1;

    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");
    bytes32 public constant AIRDROP_ROLE = keccak256("AIRDROP_ROLE");

    uint256 public constant INITIAL_RESERVE = 10_080_000 ether;

    bytes32 public constant TAG_INITIAL = keccak256("INITIAL_RESERVE");
    bytes32 public constant TAG_UNUSED_EMISSION = keccak256("UNUSED_EMISSION");
    /// @notice Purpose on every supplyAirdrop() TreasuryPaid event.
    bytes32 public constant PURPOSE_LP_AIRDROP = keccak256("LP_AIRDROP");

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

        require(gg_ != address(0), "InsuranceTreasury: zero gg");
        gg = gg_;
    }

    // ============ Flows ============

    /// @notice Pull `amount` GG from the calling router and book it under `sourceTag`.
    ///         ROUTER_ROLE only. The caller must have approved this contract first.
    function credit(uint256 amount, bytes32 sourceTag) external override onlyRole(ROUTER_ROLE) nonReentrant {
        require(amount > 0, "InsuranceTreasury: zero amount");

        IERC20(gg).safeTransferFrom(msg.sender, address(this), amount);
        creditedByTag[sourceTag] += amount;
        totalCredited += amount;

        emit TreasuryCredited(sourceTag, msg.sender, amount);
    }

    /// @notice Send `amount` GG to `to` for the LP dynamic airdrop. AIRDROP_ROLE only.
    function supplyAirdrop(address to, uint256 amount) external override onlyRole(AIRDROP_ROLE) nonReentrant {
        require(to != address(0), "InsuranceTreasury: zero recipient");
        require(amount > 0, "InsuranceTreasury: zero amount");

        IERC20(gg).safeTransfer(to, amount);
        totalPaid += amount;

        emit TreasuryPaid(to, amount, PURPOSE_LP_AIRDROP);
    }

    // ============ Views ============

    /// @notice GG currently held (booked inflows minus payouts, plus anything transferred in directly).
    function balance() external view override returns (uint256) {
        return IERC20(gg).balanceOf(address(this));
    }
}
