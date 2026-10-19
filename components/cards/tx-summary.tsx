import { AddressLink } from "@/components/address-link";
import { AmountText } from "@/components/amount-text";
import { CHAINS } from "@/lib/chain/chains";
import type { TxFacts } from "@/lib/chain/facts";

const time = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" });

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 border-t border-line py-2.5 first:border-t-0">
      <dt className="text-ink-faint">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function TxSummary({ facts }: { facts: TxFacts }) {
  const chain = CHAINS[facts.chain];
  return (
    <section aria-labelledby="summary-heading" className="rounded-lg bg-paper p-5 shadow-[0_1px_0_var(--color-line)]">
      <h2 id="summary-heading" className="sr-only">
        Summary
      </h2>
      <dl className="text-sm">
        <Row term="Status">
          {facts.status === "success" ? (
            <span className="font-medium text-gain">Succeeded</span>
          ) : (
            <span className="rounded bg-loss-soft px-1.5 py-0.5 font-medium text-loss">Reverted</span>
          )}
        </Row>
        <Row term="From">
          <AddressLink value={facts.from} explorer={chain.explorer} />
        </Row>
        {facts.to && (
          <Row term="To">
            <AddressLink value={facts.to} explorer={chain.explorer} />
          </Row>
        )}
        {facts.contractCreated && (
          <Row term="Created">
            <AddressLink value={facts.contractCreated} explorer={chain.explorer} />
          </Row>
        )}
        <Row term="Value">
          <AmountText amount={facts.value} />
        </Row>
        <Row term="Fee">
          <AmountText amount={facts.fee} />
        </Row>
        <Row term="Time">
          <time dateTime={new Date(facts.timestamp * 1000).toISOString()}>{time.format(facts.timestamp * 1000)} UTC</time>
        </Row>
        <Row term="Block">
          <a
            href={`${chain.explorer}/block/${facts.blockNumber}`}
            className="font-mono text-accent underline decoration-accent/30 underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            {Number(facts.blockNumber).toLocaleString("en-US")}
          </a>
        </Row>
      </dl>
      <a
        href={`${chain.explorer}/tx/${facts.hash}`}
        className="mt-3 inline-block text-sm text-accent underline decoration-accent/30 underline-offset-2"
        target="_blank"
        rel="noreferrer"
      >
        Open in {new URL(chain.explorer).hostname}
      </a>
    </section>
  );
}
