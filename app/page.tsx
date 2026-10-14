export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <p className="font-mono text-sm text-ink-faint">Ethereum · Base · Arbitrum · Avalanche</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Onchain Copilot</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-soft">
        Paste a transaction hash and get a plain-English explanation: decoded calls, token flows and fees, narrated by an
        AI that never does the math.
      </p>
    </main>
  );
}
