// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IFeeRouter {
    event FeeRouted(bytes32 indexed source, address indexed token, address indexed to, uint256 amount, bytes32 purpose);

    /// @notice Route a turbine fee already collected: pulls `amount` of
    ///         `token` from the caller, which must have approved it.
    ///         COLLECTOR_ROLE only.
    function routeTurbineFee(address token, uint256 amount) external;

    /// @notice Route a sell fee of `source` already collected: pulls `amount`
    ///         of `token` from the caller, which must have approved it.
    ///         COLLECTOR_ROLE only.
    function routeSellFee(bytes32 source, address token, uint256 amount) external;
}
