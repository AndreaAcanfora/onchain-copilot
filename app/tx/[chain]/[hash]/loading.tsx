import { SiteHeader } from "@/components/site-header";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-20" aria-busy="true">
        <p className="text-sm text-ink-faint">Reading the transaction, its receipt and the contracts it touched…</p>
        <div className="mt-3 h-10 w-2/3 animate-pulse rounded bg-line" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="h-64 animate-pulse rounded-lg bg-paper" />
          <div className="h-80 animate-pulse rounded-lg bg-paper" />
        </div>
      </main>
    </>
  );
}
