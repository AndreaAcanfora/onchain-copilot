import type { DecodedCall as Call } from "@/lib/chain/facts";
import { AbiSourceTag } from "./abi-source";

export function DecodedCall({ call }: { call: Call }) {
  return (
    <section aria-labelledby="call-heading" className="rounded-lg bg-paper p-5 shadow-[0_1px_0_var(--color-line)]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="call-heading" className="font-display text-lg font-semibold">
          Function called
        </h2>
        <AbiSourceTag source={call.abiSource} />
      </div>
      <p className="mt-2 font-mono text-sm break-all">{call.signature ?? call.selector}</p>
      {call.args.length > 0 && (
        <dl className="mt-3 text-sm">
          {call.args.map((arg) => (
            <div key={arg.name} className="grid grid-cols-1 gap-0.5 border-t border-line py-2 sm:grid-cols-[10rem_1fr] sm:gap-3">
              <dt>
                {arg.name} <span className="text-ink-faint">{arg.type}</span>
              </dt>
              <dd className="max-h-32 overflow-y-auto font-mono break-all text-ink-soft">{arg.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
