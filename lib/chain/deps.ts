import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { CHAINS, type ChainKey } from "./chains";

/**
 * Everything analysis touches on the network. Injected so tests can replay
 * recorded responses and never hit an RPC or an API.
 */
export interface ChainDeps {
  client: PublicClient;
  /** Mainnet client for ENS reverse lookups; absent means no ENS names. */
  ensClient?: PublicClient;
  fetchJson: (url: string) => Promise<unknown>;
}

export function createClient(key: ChainKey): PublicClient {
  const chain = CHAINS[key];
  return createPublicClient({
    chain: chain.viem,
    transport: fallback(chain.rpcUrls.map((url) => http(url, { timeout: 10_000, retryCount: 1 }))),
  }) as PublicClient;
}

class HttpError extends Error {
  constructor(readonly status: number, url: string) {
    super(`${status} ${url}`);
  }
}

async function fetchOnce(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new HttpError(res.status, url);
  return res.json();
}

/** One retry on timeouts and 5xx; a 4xx (e.g. Sourcify 404 for an unverified contract) is an answer, not a failure. */
export async function fetchJson(url: string): Promise<unknown> {
  try {
    return await fetchOnce(url);
  } catch (error) {
    if (error instanceof HttpError && error.status < 500) throw error;
    return fetchOnce(url);
  }
}

export function liveDeps(key: ChainKey): ChainDeps {
  return { client: createClient(key), ensClient: createClient("ethereum"), fetchJson };
}
