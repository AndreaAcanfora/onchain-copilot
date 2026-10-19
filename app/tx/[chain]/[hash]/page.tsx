import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Hex } from "viem";
import { BalanceChanges } from "@/components/cards/balance-changes";
import { DecodedCall } from "@/components/cards/decoded-call";
import { EventList } from "@/components/cards/event-list";
import { TxSummary } from "@/components/cards/tx-summary";
import { SiteHeader } from "@/components/site-header";
import { shortAddress } from "@/lib/address";
import { CHAINS, isChainKey, TX_HASH, type ChainKey } from "@/lib/chain/chains";
import { findOnOtherChains, loadTransaction } from "@/lib/chain/load";
import { headline } from "@/lib/headline";

type Params = Promise<{ chain: string; hash: string }>;

async function parse(params: Params): Promise<{ chain: ChainKey; hash: Hex }> {
  const { chain, hash } = await params;
  if (!isChainKey(chain) || !TX_HASH.test(hash)) notFound();
  return { chain, hash: hash as Hex };
}

const load = cache(loadTransaction);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { chain, hash } = await parse(params);
  const result = await load(chain, hash);
  const subject = result.kind === "ok" ? headline(result.facts) : `Transaction ${shortAddress(hash)}`;
  return { title: `${subject} on ${CHAINS[chain].name} | Onchain Copilot` };
}

export default async function TxPage({ params }: { params: Params }) {
  const { chain, hash } = await parse(params);
  const result = await load(chain, hash);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-20">
        <p className="text-sm text-ink-faint">
          {CHAINS[chain].name} transaction <span className="font-mono">{shortAddress(hash)}</span>
        </p>
        {result.kind === "ok" ? (
          <>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{headline(result.facts)}</h1>
            {/* Mobile reads top to bottom: what moved, the receipt, then the details. */}
            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
              <BalanceChanges
                chain={chain}
                flows={result.facts.flows}
                transfers={result.facts.transfers}
                reverted={result.facts.status === "reverted"}
              />
              <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1">
                <TxSummary facts={result.facts} />
              </div>
              {result.facts.call && <DecodedCall call={result.facts.call} />}
              <EventList chain={chain} events={result.facts.events} />
            </div>
          </>
        ) : result.kind === "pending" ? (
          <Pending />
        ) : (
          <NotFound chain={chain} hash={hash} />
        )}
      </main>
    </>
  );
}

function Pending() {
  return (
    <>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Waiting to be included in a block</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        The network has this transaction but has not executed it yet, so there is nothing to explain. Reload in a few
        seconds.
      </p>
    </>
  );
}

async function NotFound({ chain, hash }: { chain: ChainKey; hash: Hex }) {
  const elsewhere = await findOnOtherChains(chain, hash);
  return (
    <>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        Not found on {CHAINS[chain].name}
      </h1>
      {elsewhere.length > 0 ? (
        <p className="mt-3 max-w-xl text-ink-soft">
          This hash exists on{" "}
          {elsewhere.map((key, i) => (
            <span key={key}>
              {i > 0 && " and "}
              <Link href={`/tx/${key}/${hash}`} className="text-accent underline underline-offset-2">
                {CHAINS[key].name}
              </Link>
            </span>
          ))}
          .
        </p>
      ) : (
        <p className="mt-3 max-w-xl text-ink-soft">
          No supported network knows this hash. Check that it was copied in full, or wait a moment if it was just sent.
        </p>
      )}
      <Link href="/" className="mt-6 inline-block text-accent underline underline-offset-2">
        Look up another transaction
      </Link>
    </>
  );
}
