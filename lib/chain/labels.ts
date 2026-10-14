import type { Address } from "viem";
import type { ChainKey } from "./chains";
import type { ChainDeps } from "./deps";
import curated from "./labels.json";

const CURATED = curated as Record<string, Record<string, string>>;
const MAX_ENS_LOOKUPS = 6;

export function curatedLabel(chain: ChainKey, address: string): string | null {
  const key = address.toLowerCase();
  return CURATED[chain]?.[key] ?? CURATED["*"]?.[key] ?? null;
}

/**
 * Label precedence: curated list, then the verified contract name, then the
 * ENS primary name (Ethereum only, where the name actually belongs to the address).
 */
export async function resolveLabels(
  deps: ChainDeps,
  chain: ChainKey,
  addresses: Address[],
  contractNames: Map<string, string>,
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const unlabeled: Address[] = [];
  for (const address of addresses) {
    const key = address.toLowerCase();
    const label = curatedLabel(chain, key) ?? contractNames.get(key);
    if (label) labels.set(key, label);
    else unlabeled.push(address);
  }

  if (chain === "ethereum" && deps.ensClient) {
    const ensClient = deps.ensClient;
    const names = await Promise.all(
      unlabeled.slice(0, MAX_ENS_LOOKUPS).map((address) => ensClient.getEnsName({ address }).catch(() => null)),
    );
    names.forEach((name, i) => {
      const address = unlabeled[i];
      if (name && address) labels.set(address.toLowerCase(), name);
    });
  }
  return labels;
}
