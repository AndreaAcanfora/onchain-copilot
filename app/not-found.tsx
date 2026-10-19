import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">This link does not point to a transaction</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Transaction pages look like <span className="font-mono">/tx/ethereum/0x…</span>, with a supported network and a
        hash of 0x followed by 64 hex characters.
      </p>
      <Link href="/" className="mt-6 inline-block text-accent underline underline-offset-2">
        Look up a transaction
      </Link>
    </main>
  );
}
