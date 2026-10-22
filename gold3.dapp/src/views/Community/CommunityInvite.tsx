import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { t } from "@lingui/macro";
import { Address, BaseError, isAddress, zeroAddress } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { COMMUNITY_ABI } from "src/abi/Community";
import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import { ANUBIS_CHAIN_ID, COMMUNITY_ADDRESS } from "src/constants";

// 推薦關係 - not on the boards. The invite link and join() on the shared
// Community. The link is copyable only once the account has joined (the
// contract rejects a referrer that is not a member); join() is disabled while
// joinOpen is false, after the account has joined, and for an empty or invalid
// referrer (an empty one is not sent: the contract would bind it to commRoot).

function errorMessage(err: unknown): string {
    return err instanceof BaseError ? err.shortMessage : (err as Error).message;
}

function CommunityInvite() {
    const [searchParams] = useSearchParams();
    const [referrer, setReferrer] = useState(() => searchParams.get("ref") ?? "");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");
    const { address, isConnected } = useAccount();

    const joinOpen = useReadContract({
        address: COMMUNITY_ADDRESS,
        abi: COMMUNITY_ABI,
        functionName: "joinOpen",
        chainId: ANUBIS_CHAIN_ID,
    });
    const member = useReadContract({
        address: COMMUNITY_ADDRESS,
        abi: COMMUNITY_ABI,
        functionName: "members",
        args: address ? [address] : undefined,
        chainId: ANUBIS_CHAIN_ID,
        query: { enabled: !!address },
    });

    const { writeContractAsync, data: txHash, isPending: isSigning } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash, chainId: ANUBIS_CHAIN_ID });

    useEffect(() => {
        if (joinOpen.error) console.error("community: joinOpen read failed:", joinOpen.error.message, joinOpen.error);
    }, [joinOpen.error]);

    useEffect(() => {
        if (member.error) console.error("community: members read failed:", member.error.message, member.error);
    }, [member.error]);

    const refetchMember = member.refetch;
    useEffect(() => {
        if (receipt.isSuccess) refetchMember();
    }, [receipt.isSuccess, refetchMember]);

    useEffect(() => {
        if (receipt.error) {
            console.error("community: join transaction failed:", receipt.error.message, receipt.error);
            setError(errorMessage(receipt.error));
        }
    }, [receipt.error]);

    const joined = member.data ? member.data[1] !== zeroAddress : undefined;

    const inviteLink = address ? `${window.location.origin}${window.location.pathname}#/community?ref=${address}` : "";
    let inviteText = inviteLink;
    if (!isConnected) inviteText = t`連接錢包後生成邀請連結`;
    else if (joined === false) inviteText = t`綁定推薦人後才可邀請`;

    let bindReason = "";
    if (!isConnected) bindReason = t`請先連接錢包`;
    else if (joinOpen.isError || member.isError) bindReason = t`讀取失敗`;
    else if (joinOpen.data === undefined || joined === undefined) bindReason = t`讀取中`;
    else if (!joinOpen.data) bindReason = t`邀請未開放`;
    else if (joined) bindReason = t`已綁定推薦人`;
    else if (referrer === "") bindReason = t`請輸入推薦人地址`;
    else if (!isAddress(referrer)) bindReason = t`地址不合法`;
    else if (isSigning) bindReason = t`請在錢包確認`;
    else if (receipt.isLoading) bindReason = t`綁定中…`;

    const readError = joinOpen.error ?? member.error;
    const message = error || (readError ? t`讀取 Community 失敗：${errorMessage(readError)}` : "");

    async function copy() {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("community: copy invite link failed:", (err as Error).message, err);
            setError(t`複製失敗：${(err as Error).message}`);
        }
    }

    async function bind() {
        setError("");
        try {
            await writeContractAsync({
                address: COMMUNITY_ADDRESS,
                abi: COMMUNITY_ABI,
                functionName: "join",
                args: [referrer as Address],
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("community: join failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    return (
        <Card icon="share" title={t`推薦關係`} subtitle={t`邀請好友加入 · 綁定推薦人`}>
            <div className="gp-grid gp-grid-2 gp-grid-tight">
                <div className="gp-subcard">
                    <h4 className="gp-subcard-title">{t`綁定推薦人`}</h4>
                    <div className="gp-invite-field">
                        <input
                            className="gp-invite-value gp-invite-input"
                            placeholder={t`推薦人地址 0x…`}
                            value={referrer}
                            onChange={event => setReferrer(event.target.value)}
                            spellCheck={false}
                        />
                        <button type="button" className="gp-btn gp-btn-primary gp-btn-sm" onClick={bind} disabled={!!bindReason}>
                            {bindReason || t`綁定`}
                        </button>
                    </div>
                </div>

                <div className="gp-subcard">
                    <h4 className="gp-subcard-title">{t`邀請連結`}</h4>
                    <div className="gp-invite-field">
                        <span className="gp-invite-value">{inviteText}</span>
                        <button
                            type="button"
                            className="gp-btn gp-btn-outline gp-btn-sm"
                            onClick={copy}
                            disabled={!inviteLink || joined !== true}
                        >
                            <Icon name="copy" size={14} />
                            {copied ? t`已複製` : t`複製`}
                        </button>
                    </div>
                </div>
            </div>

            {message && <p className="gp-invite-error gp-small">{message}</p>}
        </Card>
    );
}

export default CommunityInvite;
