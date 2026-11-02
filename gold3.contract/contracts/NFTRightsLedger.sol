// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/INFTRightsLedger.sol";
import "./interface/IGGToken.sol";
import "./interface/IOracleAdapter.sol";

/**
 * @title NFTRightsLedger
 * @notice NFT rights quota (spec §06): burn GOT2 (2x) or GG (3x) at the live
 *         USDT value; quotas accumulate. Consumed by ClaimController only.
 *         Independent of the power multipliers.
 * @dev The NFT carrier is an open item (spec §13); the quota is a plain
 *      per-account balance here.
 */
contract NFTRightsLedger is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, INFTRightsLedger {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    uint256 public constant BPS = 10_000;

    uint256 public constant GOT2_RIGHTS_BPS = 20_000;
    uint256 public constant GG_RIGHTS_BPS = 30_000;

    // ============ Storage ============

    address public got2;
    address public gg;
    address public oracle;

    /// @notice Remaining quota in USDT (18 decimals).
    mapping(address => uint256) public override rightsOf;
    mapping(address => uint256) public totalCreatedOf;
    mapping(address => uint256) public totalConsumedOf;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address got2_, address gg_, address oracle_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        got2 = got2_;
        gg = gg_;
        oracle = oracle_;
    }

    // ============ Rights ============

    function burnForNFTRights(address asset, uint256 amount) external override nonReentrant returns (uint256 rights) {
        require(amount > 0, "NFTRightsLedger: zero amount");
        require(asset == got2 || asset == gg, "NFTRightsLedger: unsupported asset");

        uint256 usdtValue = IOracleAdapter(oracle).valueUSDT(asset, amount);
        rights = usdtValue * (asset == gg ? GG_RIGHTS_BPS : GOT2_RIGHTS_BPS) / BPS;
        require(rights > 0, "NFTRightsLedger: zero rights");

        IGGToken(asset).burnFrom(msg.sender, amount);
        emit TokensBurned(asset, msg.sender, amount);

        rightsOf[msg.sender] += rights;
        totalCreatedOf[msg.sender] += rights;
        emit RightsCreated(msg.sender, asset, amount, usdtValue, rights);
    }

    function consume(address account, uint256 rights) external override onlyRole(CONSUMER_ROLE) {
        require(rights > 0, "NFTRightsLedger: zero rights");
        require(rightsOf[account] >= rights, "NFTRightsLedger: insufficient rights");
        rightsOf[account] -= rights;
        totalConsumedOf[account] += rights;
        emit RightsConsumed(account, rights);
    }
}
