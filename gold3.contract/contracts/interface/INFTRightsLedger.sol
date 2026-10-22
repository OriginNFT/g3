// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface INFTRightsLedger {
    event RightsCreated(
        address indexed account,
        address indexed asset,
        uint256 burnedAmount,
        uint256 usdtValue,
        uint256 rights
    );
    event RightsConsumed(address indexed account, uint256 rights);
    event TokensBurned(address indexed token, address indexed from, uint256 amount);

    function burnForNFTRights(address asset, uint256 amount) external returns (uint256 rights);

    function consume(address account, uint256 rights) external;

    function rightsOf(address account) external view returns (uint256);
}
