import { AddressLink } from "@/components/address-link";
import { CHAINS, type ChainKey } from "@/lib/chain/chains";
import type { Flow, Transfer } from "@/lib/chain/facts";
import { formatToken, formatUsd } from "@/lib/format";

function groupByAddress(flows: Flow[]): Flow[][] {
  const groups = new Map<string, Flow[]>();
  for (const flow of flows) {
    const key = flow.address.address.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), flow]);
  }
  return [...groups.values()];
}

function FlowRow({ flow }: { flow: Flow }) {
  const negative = (flow.amount?.value ?? flow.nftDelta ?? 0) < 0;
  const quantity = flow.amount
    ? formatToken(Math.abs(flow.amount.value), flow.amount.symbol)
    : `${Math.abs(flow.nftDelta ?? 0)} ${flow.asset.replace(/ #$/, "")} NFT`;
  return (
    <li className="grid grid-cols-[1fr_6.5rem] items-baseline gap-3 font-mono text-base sm:grid-cols-[1fr_8rem] sm:text-lg">
      <span className={`text-right ${negative ? "text-loss" : "text-gain"}`}>
        {negative ? "−" : "+"}
        {quantity}
      </span>
      <span className="text-right text-sm text-ink-faint sm:text-base">
        {flow.amount?.usd != null ? formatUsd(Math.abs(flow.amount.usd)) : ""}
      </span>
    </li>
  );
}

function transferText(t: Transfer): string {
  if (t.kind === "nft") return `${t.token.symbol} #${t.tokenId}${t.quantity !== "1" ? ` ×${t.quantity}` : ""}`;
  return formatToken(t.amount.value, t.amount.symbol);
}

export function BalanceChanges({
  chain,
  flows,
  transfers,
  reverted,
}: {
  chain: ChainKey;
  flows: Flow[];
  transfers: Transfer[];
  reverted: boolean;
}) {
  const explorer = CHAINS[chain].explorer;
  return (
    <section aria-labelledby="flows-heading" className="rounded-lg bg-paper p-5 shadow-[0_1px_0_var(--color-line)]">
      <h2 id="flows-heading" className="font-display text-lg font-semibold">
        Balance changes
      </h2>
      {flows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">
          {reverted
            ? "Nothing moved: the transaction reverted, so every change was undone and only the fee was paid."
            : "No tokens changed hands in this transaction."}
        </p>
      ) : (
        <ul className="mt-3">
          {groupByAddress(flows).map((group) => (
            <li key={group[0]!.address.address} className="border-t border-line py-3 first:border-t-0">
              <AddressLink value={group[0]!.address} explorer={explorer} />
              <ul className="mt-1.5 space-y-1">
                {group.map((flow) => (
                  <FlowRow key={flow.asset} flow={flow} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {transfers.length > 0 && (
        <details className="mt-3 border-t border-line pt-3 text-sm">
          <summary className="cursor-pointer text-ink-soft">
            {transfers.length === 1 ? "1 transfer" : `${transfers.length} transfers`} behind these totals
          </summary>
          <ol className="mt-2 space-y-2">
            {transfers.map((t, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="font-mono">{transferText(t)}</span>
                <span className="text-ink-faint">from</span>
                <AddressLink value={t.from} explorer={explorer} />
                <span className="text-ink-faint">to</span>
                <AddressLink value={t.to} explorer={explorer} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
