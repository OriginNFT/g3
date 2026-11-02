// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

/// @notice The existing turbine (spec §13) as the protocol delivers to it:
///         every GG a user claims goes to the turbine, never straight to the
///         user. Pull model: the caller approves `amount` first and the
///         turbine pulls it in the same call.
interface ITurbine {
    function creditClaimed(address user, uint256 amount) external;
}
