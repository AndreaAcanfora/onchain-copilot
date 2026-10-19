import { AddressLink } from "@/components/address-link";
import { CHAINS, type ChainKey } from "@/lib/chain/chains";
import type { DecodedEvent } from "@/lib/chain/facts";
import { AbiSourceTag } from "./abi-source";

export function EventList({ chain, events }: { chain: ChainKey; events: DecodedEvent[] }) {
  if (events.length === 0) return null;
  const explorer = CHAINS[chain].explorer;
  return (
    <section aria-labelledby="events-heading" className="rounded-lg bg-paper p-5 shadow-[0_1px_0_var(--color-line)]">
      <details>
        <summary className="cursor-pointer">
          <h2 id="events-heading" className="inline font-display text-lg font-semibold">
            Events emitted ({events.length})
          </h2>
        </summary>
        <ol className="mt-3 text-sm">
          {events.map((event) => (
            <li key={event.logIndex} className="border-t border-line py-2.5 first:border-t-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono">{event.name ?? "Unknown event"}</span>
                <AbiSourceTag source={event.abiSource} />
              </div>
              <div className="mt-0.5 text-ink-faint">
                by <AddressLink value={event.emitter} explorer={explorer} />
              </div>
              {event.args.length > 0 && (
                <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  {event.args.map((arg) => (
                    <div key={arg.name} className="contents">
                      <dt className="text-ink-faint">{arg.name}</dt>
                      <dd className="font-mono break-all">{arg.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
