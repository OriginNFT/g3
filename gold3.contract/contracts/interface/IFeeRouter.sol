// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IFeeRouter {
    event FeeRouted(bytes32 indexed source, address indexed token, address indexed to, uint256 amount, bytes32 purpose);

    function routeTurbineFee(address token, uint256 amount) external;

    function routeSellFee(bytes32 source, address token, uint256 amount) external;
}
