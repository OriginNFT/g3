// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface ITierStaking {
    event TierStaked(address indexed account, uint256 amount);
    event TierUnstaked(address indexed account, uint256 amount);
    event TierChanged(address indexed account, uint8 fromTier, uint8 toTier);

    function stakeTierGG(uint256 amount) external;

    function unstakeTierGG(uint256 amount) external;

    /// @notice Re-evaluate `account` at the live GG price and emit TierChanged if it moved.
    function syncTier(address account) external;

    function lockedOf(address account) external view returns (uint256);

    function lockedValueUSDT(address account) external view returns (uint256);

    /// @notice Tier from the locked GG value alone.
    function stakeTierOf(address account) external view returns (uint8);
}
