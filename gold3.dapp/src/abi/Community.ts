import { parseAbi } from "viem";

// Community - the referral tree shared with GOLDEN PACT (goldenpact/gp.contract
// contracts/invitation/Community.sol, Anubis 2.0 instance). members() is the
// public getter of the member struct without its referrals array; referrer is
// address(0) until the member joins. join() records msg.sender under _referer
// and is gated by joinOpen().
export const COMMUNITY_ABI = parseAbi([
    "function members(address) view returns (uint256 level, address referrer, uint256 activityPoint)",
    "function joinOpen() view returns (bool)",
    // ---- Writes ----
    "function join(address _referer)",
]);
