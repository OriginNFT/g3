// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IClaimController {
    event CommunityGGClaimed(address indexed account, uint256 ggAmount, uint256 ggPrice, uint256 rightsDeducted);

    function claimCommunityGG(uint256 amount) external;

    function claimable(address account) external view returns (uint256);
}
