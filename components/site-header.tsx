import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto max-w-5xl px-4 pt-5">
      <Link href="/" className="font-display text-base font-semibold tracking-tight">
        Onchain Copilot
      </Link>
    </header>
  );
}
