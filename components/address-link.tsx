import { shortAddress } from "@/lib/address";
import type { AddressRef } from "@/lib/chain/facts";

export function AddressLink({ value, explorer }: { value: AddressRef; explorer: string }) {
  return (
    <a
      href={`${explorer}/address/${value.address}`}
      title={value.address}
      className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
      target="_blank"
      rel="noreferrer"
    >
      {value.label ? value.label : <span className="font-mono">{shortAddress(value.address)}</span>}
    </a>
  );
}
