// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {DayShareLedger} from "./lib/DayShareLedger.sol";
import "./interface/IComputingVault.sol";
import "./interface/IGGToken.sol";
import "./interface/IOracleAdapter.sol";
import "./interface/IReserveVault.sol";
import "./interface/IProtectionVault.sol";
import "./interface/IEmissionController.sol";
import "./interface/ITurbine.sol";

/**
 * @title ComputingVault
 * @notice Power positions (spec §04):
 *           USDT        2.5x of the USDT received
 *           GOT2 burn   2x   of the USDT value at burn time, really burnt
 *           GG burn     2.5x of the USDT value at burn time, really burnt
 *         Cash actually received is split 95% ReserveVault / 5% ProtectionVault.
 *         Burnt tokens are never booked as received USDT.
 *         Also receives the daily holding 50% of the emission and pays it
 *         pro rata to power, day-granular: a position opened on day d earns
 *         from day d. Power is permanent and never withdrawn. Claimed GG is
 *         delivered to the turbine, never straight to the user.
 */
contract ComputingVault is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IComputingVault {
    using SafeERC20 for IERC20;
    using DayShareLedger for DayShareLedger.Pool;
    using DayShareLedger for DayShareLedger.Account;

    uint256 public constant IMPL_REV = 1;

    bytes32 public constant EMISSION_ROLE = keccak256("EMISSION_ROLE");

    uint256 public constant BPS = 10_000;

    uint256 public constant USDT_POWER_BPS = 25_000;
    uint256 public constant GOT2_BURN_POWER_BPS = 20_000;
    uint256 public constant GG_BURN_POWER_BPS = 25_000;

    uint256 public constant RESERVE_BPS = 9_500;
    uint256 public constant PROTECTION_BPS = 500;

    uint8 public constant STATUS_ACTIVE = 1;

    // ============ Storage ============

    address public usdt;
    address public got2;
    address public gg;
    address public oracle;
    address public reserveVault;
    address public protectionVault;
    address public emissionController;
    address public turbine;

    uint256 public nextPositionId;
    mapping(uint256 => Position) internal _positions;
    mapping(address => uint256[]) internal _positionIds;

    mapping(address => uint256) public override powerOf;
    uint256 public override totalPower;

    DayShareLedger.Pool internal _pool;
    mapping(address => DayShareLedger.Account) internal _accounts;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(
        address usdt_,
        address got2_,
        address gg_,
        address oracle_,
        address reserveVault_,
        address protectionVault_,
        address emissionController_
    ) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        usdt = usdt_;
        got2 = got2_;
        gg = gg_;
        oracle = oracle_;
        reserveVault = reserveVault_;
        protectionVault = protectionVault_;
        emissionController = emissionController_;
        nextPositionId = 1;
    }

    // ============ Admin ============

    function setTurbine(address turbine_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        turbine = turbine_;
        emit TurbineSet(turbine_);
    }

    // ============ Participation ============

    function participate(
        address asset,
        uint256 amount,
        uint256 minPower
    ) external override nonReentrant returns (uint256 positionId) {
        require(amount > 0, "ComputingVault: zero amount");

        uint256 inputAmount;
        uint256 usdtValue;
        uint256 power;
        if (asset == usdt) {
            uint256 before = IERC20(usdt).balanceOf(address(this));
            IERC20(usdt).safeTransferFrom(msg.sender, address(this), amount);
            inputAmount = IERC20(usdt).balanceOf(address(this)) - before;
            usdtValue = IOracleAdapter(oracle).valueUSDT(usdt, inputAmount);
            power = usdtValue * USDT_POWER_BPS / BPS;
            require(power >= minPower, "ComputingVault: power below minimum");

            uint256 toProtection = inputAmount * PROTECTION_BPS / BPS;
            uint256 toReserve = inputAmount - toProtection;
            IERC20(usdt).forceApprove(reserveVault, toReserve);
            IReserveVault(reserveVault).deposit(toReserve);
            IERC20(usdt).forceApprove(protectionVault, toProtection);
            IProtectionVault(protectionVault).deposit(toProtection);
        } else if (asset == got2 || asset == gg) {
            inputAmount = amount;
            usdtValue = IOracleAdapter(oracle).valueUSDT(asset, amount);
            power = usdtValue * (asset == gg ? GG_BURN_POWER_BPS : GOT2_BURN_POWER_BPS) / BPS;
            require(power >= minPower, "ComputingVault: power below minimum");

            IGGToken(asset).burnFrom(msg.sender, amount);
            emit TokensBurned(asset, msg.sender, amount);
        } else {
            revert("ComputingVault: unsupported asset");
        }
        require(power > 0, "ComputingVault: zero power");

        positionId = nextPositionId++;
        _positions[positionId] = Position({
            owner: msg.sender,
            asset: asset,
            inputAmount: inputAmount,
            usdtValue: usdtValue,
            power: power,
            createdAt: uint64(block.timestamp),
            status: STATUS_ACTIVE
        });
        _positionIds[msg.sender].push(positionId);

        uint256 day = IEmissionController(emissionController).currentDay();
        _pool.deposit(_accounts[msg.sender], power, day == 0 ? 1 : day);
        powerOf[msg.sender] += power;
        totalPower += power;

        emit PositionCreated(positionId, msg.sender, asset, inputAmount, usdtValue, power);
    }

    // ============ Holding reward ============

    function notifyHoldingReward(
        uint256 dayId,
        uint256 amount
    ) external override onlyRole(EMISSION_ROLE) nonReentrant returns (uint256 undistributed) {
        undistributed = _pool.settle(dayId, amount);
        uint256 distributed = amount - undistributed;
        if (distributed > 0) {
            IERC20(gg).safeTransferFrom(msg.sender, address(this), distributed);
        }
        emit HoldingRewardNotified(dayId, distributed);
    }

    function claimHoldingReward() external override nonReentrant returns (uint256 amount) {
        require(turbine != address(0), "ComputingVault: turbine not set");
        amount = _pool.claim(_accounts[msg.sender]);
        require(amount > 0, "ComputingVault: nothing to claim");
        IERC20(gg).forceApprove(turbine, amount);
        ITurbine(turbine).creditClaimed(msg.sender, amount);
        emit HoldingRewardClaimed(msg.sender, amount);
    }

    // ============ Views ============

    function pendingHoldingReward(address account) external view override returns (uint256) {
        return _pool.pendingReward(_accounts[account]);
    }

    function getPosition(uint256 positionId) external view override returns (Position memory) {
        return _positions[positionId];
    }

    function positionIdsOf(address account) external view override returns (uint256[] memory) {
        return _positionIds[account];
    }
}
