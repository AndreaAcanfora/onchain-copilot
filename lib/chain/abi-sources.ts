import type { Abi, Address, Hex } from "viem";
import type { ChainDeps } from "./deps";

export interface VerifiedContract {
  name: string | null;
  abi: Abi;
}

interface SourcifyContract {
  abi?: Abi;
  compilation?: { name?: string };
  proxyResolution?: { isProxy?: boolean; implementations?: { address: Address }[] };
}

async function fetchSourcify(deps: ChainDeps, chainId: number, address: Address): Promise<SourcifyContract | null> {
  try {
    return (await deps.fetchJson(
      `https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=abi,compilation,proxyResolution`,
    )) as SourcifyContract;
  } catch {
    return null;
  }
}

/** Verified ABI from Sourcify; for a proxy, the implementation ABI is merged in so calls decode against the real logic. */
export async function fetchVerifiedContract(
  deps: ChainDeps,
  chainId: number,
  address: Address,
): Promise<VerifiedContract | null> {
  const contract = await fetchSourcify(deps, chainId, address);
  if (!contract?.abi) return null;

  const abi: Abi[number][] = [...contract.abi];
  const implementation = contract.proxyResolution?.isProxy ? contract.proxyResolution.implementations?.[0] : undefined;
  if (!implementation) return { name: contract.compilation?.name ?? null, abi };

  // A proxy's own name ("ERC1967Proxy") says nothing about what it does: only the implementation's name is a label.
  const impl = await fetchSourcify(deps, chainId, implementation.address);
  if (impl?.abi) abi.push(...impl.abi);
  return { name: impl?.compilation?.name ?? null, abi };
}

interface SignatureLookup {
  result?: {
    function?: Record<string, { name: string; filtered: boolean }[] | null>;
    event?: Record<string, { name: string; filtered: boolean }[] | null>;
  };
}

export interface Signatures {
  functions: Record<Hex, string[]>;
  events: Record<Hex, string[]>;
}

function pickNames(entries: { name: string; filtered: boolean }[] | null | undefined): string[] {
  if (!entries) return [];
  return [...entries.filter((e) => !e.filtered), ...entries.filter((e) => e.filtered)].map((e) => e.name);
}

/** Text signatures for unknown selectors and topics, one request for all of them. Unfiltered candidates first. */
export async function lookupSignatures(
  deps: ChainDeps,
  query: { functions: Hex[]; events: Hex[] },
): Promise<Signatures> {
  const empty: Signatures = { functions: {}, events: {} };
  if (query.functions.length === 0 && query.events.length === 0) return empty;

  const params = new URLSearchParams();
  if (query.functions.length) params.set("function", query.functions.join(","));
  if (query.events.length) params.set("event", query.events.join(","));
  try {
    const body = (await deps.fetchJson(
      `https://api.4byte.sourcify.dev/signature-database/v1/lookup?${params.toString()}`,
    )) as SignatureLookup;
    const out: Signatures = { functions: {}, events: {} };
    for (const [selector, entries] of Object.entries(body.result?.function ?? {})) out.functions[selector as Hex] = pickNames(entries);
    for (const [topic, entries] of Object.entries(body.result?.event ?? {})) out.events[topic as Hex] = pickNames(entries);
    return out;
  } catch {
    return empty;
  }
}
