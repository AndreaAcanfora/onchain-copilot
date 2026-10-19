import type { AbiSource } from "@/lib/chain/facts";

const COPY: Record<AbiSource, { text: string; title: string }> = {
  verified: { text: "Verified source", title: "Decoded with the contract's verified ABI from Sourcify" },
  standard: { text: "Token standard", title: "Decoded as a standard ERC-20, ERC-721 or ERC-1155 event" },
  signature: { text: "Signature match", title: "Name from a public signature database; the contract is not verified" },
  unknown: { text: "Unknown", title: "No verified ABI and no matching signature" },
};

export function AbiSourceTag({ source }: { source: AbiSource }) {
  const { text, title } = COPY[source];
  return (
    <span title={title} className={`text-xs ${source === "unknown" ? "text-loss" : "text-ink-faint"}`}>
      {text}
    </span>
  );
}
