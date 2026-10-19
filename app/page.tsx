import Link from "next/link";
import { LookupForm } from "@/components/lookup-form";
import { CHAINS } from "@/lib/chain/chains";
import { EXAMPLES } from "@/lib/examples";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Onchain Copilot</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-soft">
        Paste a transaction hash from Ethereum, Base, Arbitrum or Avalanche and read what actually happened: who paid
        whom, which function ran, what it cost.
      </p>
      <LookupForm />
      <h2 className="mt-12 font-display text-lg font-semibold">Or open one of these</h2>
      <ul className="mt-3 divide-y divide-line rounded-lg bg-paper">
        {EXAMPLES.map((example) => (
          <li key={example.hash}>
            <Link
              href={`/tx/${example.chain}/${example.hash}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-accent-soft"
            >
              <span>{example.title}</span>
              <span className="text-sm text-ink-faint">{CHAINS[example.chain].name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
