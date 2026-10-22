// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface ILPExitBurn {
    event TokensBurned(address indexed token, address indexed pool, uint256 amount);

    function burnBpsFor(uint256 heldDays) external pure returns (uint256);

    /// @notice Remove `lpAmount` of `pool`, burn the stepped share of both underlying tokens, send the rest to `to`.
    function exitAndBurn(
        address pool,
        uint256 lpAmount,
        uint256 heldDays,
        address to,
        uint256 minA,
        uint256 minB
    ) external returns (uint256 returnedA, uint256 returnedB);
}
