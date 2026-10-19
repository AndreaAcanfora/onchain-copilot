"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CHAIN_KEYS, CHAINS, TX_HASH, type ChainKey } from "@/lib/chain/chains";

export function LookupForm({ initialChain = "ethereum" }: { initialChain?: ChainKey }) {
  const router = useRouter();
  const [hash, setHash] = useState("");
  const [chain, setChain] = useState<ChainKey>(initialChain);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = hash.trim();
    if (!TX_HASH.test(value)) {
      setError("A transaction hash is 0x followed by 64 hex characters.");
      return;
    }
    setError(null);
    router.push(`/tx/${chain}/${value}`);
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8">
      <label htmlFor="hash" className="block text-sm font-medium">
        Transaction hash
      </label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          id="hash"
          name="hash"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          placeholder="0x…"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={error !== null}
          aria-describedby={error ? "hash-error" : undefined}
          className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
        />
        <label htmlFor="chain" className="sr-only">
          Network
        </label>
        <select
          id="chain"
          value={chain}
          onChange={(e) => setChain(e.target.value as ChainKey)}
          className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm"
        >
          {CHAIN_KEYS.map((key) => (
            <option key={key} value={key}>
              {CHAINS[key].name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-accent">
          Explain transaction
        </button>
      </div>
      {error && (
        <p id="hash-error" role="alert" className="mt-2 text-sm text-loss">
          {error}
        </p>
      )}
    </form>
  );
}
