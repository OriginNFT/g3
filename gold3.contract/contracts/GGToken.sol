// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";

import "./interface/IFeeRouter.sol";

/**
 * @title GGToken
 * @notice Fixed supply of 84,000,000 GG, minted once to AllocationVault by
 *         mintAllocation() right after both proxies exist (the vault needs
 *         the token address at initialize, so the mint cannot happen in
 *         initialize here). There is no other mint path: emission releases
 *         pre-minted GG, it never mints (spec §02).
 *
 *         Sell fee hook (spec §10): a transfer INTO a registered pair is a
 *         sell and pays 3% of the GG to the FeeRouter under that pair's
 *         source, unless the sender is fee-exempt. Transfers out of a pair
 *         (buys, liquidity removal) and every other transfer are free.
 */
contract GGToken is ERC20BurnableUpgradeable, AccessControlEnumerableUpgradeable {
    uint256 public constant IMPL_REV = 1;

    uint256 public constant TOTAL_SUPPLY = 84_000_000 ether;

    uint256 public constant BPS = 10_000;
    uint256 public constant SELL_FEE_BPS = 300;

    // ============ Storage ============

    address public feeRouter;
    /// @notice FeeRouter sell source of a pair; zero = not a fee pair.
    mapping(address => bytes32) public sellSourceOf;
    mapping(address => bool) public feeExempt;

    /// @dev Reserved storage for future upgrades (append new vars above, shrink this).
    uint256[50] private __gap;

    event AllocationMinted(address indexed allocationVault, uint256 amount);
    event FeeRouterSet(address feeRouter);
    event SellPairSet(address indexed pair, bytes32 source);
    event FeeExemptSet(address indexed account, bool exempt);
    event SellFeeTaken(address indexed from, address indexed pair, uint256 fee);

    function initialize(string memory name_, string memory symbol_) external initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __AccessControlEnumerable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ============ Admin ============

    /// @notice Mint the whole supply to AllocationVault. Once: reverts as
    ///         soon as any GG exists.
    function mintAllocation(address allocationVault_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(allocationVault_ != address(0), "GGToken: zero vault");
        require(totalSupply() == 0, "GGToken: already minted");
        _mint(allocationVault_, TOTAL_SUPPLY);
        emit AllocationMinted(allocationVault_, TOTAL_SUPPLY);
    }

    function setFeeRouter(address feeRouter_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRouter = feeRouter_;
        emit FeeRouterSet(feeRouter_);
    }

    function setSellPair(address pair, bytes32 source) external onlyRole(DEFAULT_ADMIN_ROLE) {
        sellSourceOf[pair] = source;
        emit SellPairSet(pair, source);
    }

    function setFeeExempt(address account, bool exempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeExempt[account] = exempt;
        emit FeeExemptSet(account, exempt);
    }

    // ============ Hook ============

    function _update(address from, address to, uint256 value) internal override {
        bytes32 source = sellSourceOf[to];
        if (source == bytes32(0) || feeExempt[from] || feeRouter == address(0) || from == address(0)) {
            super._update(from, to, value);
            return;
        }

        uint256 fee = value * SELL_FEE_BPS / BPS;
        super._update(from, to, value - fee);
        if (fee > 0) {
            super._update(from, address(this), fee);
            _approve(address(this), feeRouter, fee);
            IFeeRouter(feeRouter).routeSellFee(source, address(this), fee);
            emit SellFeeTaken(from, to, fee);
        }
    }
}
