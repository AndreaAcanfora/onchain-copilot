import { displayName } from "./address";
import type { TxFacts } from "./chain/facts";
import { formatToken } from "./format";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * One-line summary computed from facts alone, so the page says what happened
 * before (or without) the model. Conservative: when the shape is not obvious
 * it names the call instead of guessing an intent.
 */
export function headline(facts: TxFacts): string {
  const target = facts.to ? displayName(facts.to) : null;
  if (facts.status === "reverted") return target ? `Failed call to ${target}` : "Failed transaction";
  if (facts.contractCreated) return `Deployed contract ${displayName(facts.contractCreated)}`;

  const sender = facts.from.address;
  const senderFlows = facts.flows.filter((f) => same(f.address.address, sender));
  const out = senderFlows.filter((f) => (f.amount?.value ?? 0) < 0);
  const into = senderFlows.filter((f) => (f.amount?.value ?? 0) > 0);
  const nftIn = senderFlows.filter((f) => (f.nftDelta ?? 0) > 0);

  if (out.length === 1 && into.length === 1 && nftIn.length === 0) {
    const sold = out[0]!.amount!;
    const bought = into[0]!.amount!;
    return `Swapped ${formatToken(-sold.value, sold.symbol)} for ${formatToken(bought.value, bought.symbol)}`;
  }

  const nftMint = facts.transfers.find((t) => t.kind === "nft" && t.from.label === "Null address" && same(t.to.address, sender));
  if (nftMint?.kind === "nft") return `Minted ${nftMint.token.symbol} #${nftMint.tokenId}`;

  const fungible = facts.transfers.filter((t) => t.kind !== "nft");
  const only = fungible[0];
  if (fungible.length === 1 && only && same(only.from.address, sender)) {
    return `Sent ${formatToken(only.amount.value, only.amount.symbol)} to ${displayName(only.to)}`;
  }

  if (facts.call?.functionName) return target ? `Called ${facts.call.functionName} on ${target}` : `Called ${facts.call.functionName}`;
  if (facts.call) return target ? `Called an unverified function on ${target}` : "Called an unverified function";
  return target ? `Interacted with ${target}` : "Transaction";
}
