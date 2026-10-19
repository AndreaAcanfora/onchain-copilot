"use client";

import Link from "next/link";

export default function TxError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">The network did not answer</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Every public node for this chain failed or timed out while reading the transaction. This is usually brief.
      </p>
      <div className="mt-6 flex gap-4">
        <button onClick={reset} className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-accent">
          Try again
        </button>
        <Link href="/" className="self-center text-accent underline underline-offset-2">
          Look up another transaction
        </Link>
      </div>
    </main>
  );
}
