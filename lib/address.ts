import type { AddressRef } from "./chain/facts";

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function displayName(ref: AddressRef): string {
  return ref.label ?? shortAddress(ref.address);
}
