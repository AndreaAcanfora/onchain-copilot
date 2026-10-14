import type { Address } from "viem";
import type { ChainConfig } from "./chains";
import type { ChainDeps } from "./deps";

export interface Prices {
  native: number | null;
  /** Keyed by lowercase token address. */
  tokens: Map<string, number>;
}

interface LlamaResponse {
  coins?: Record<string, { price?: number }>;
}

/** USD prices at the block's timestamp from DefiLlama (free, no key). Missing prices stay missing, never guessed. */
export async function fetchPrices(
  deps: ChainDeps,
  chain: ChainConfig,
  timestamp: number,
  tokens: Address[],
): Promise<Prices> {
  const prices: Prices = { native: null, tokens: new Map() };
  const ids = [chain.llamaNative, ...tokens.map((t) => `${chain.llamaChain}:${t.toLowerCase()}`)];
  try {
    const body = (await deps.fetchJson(
      `https://coins.llama.fi/prices/historical/${timestamp}/${ids.join(",")}`,
    )) as LlamaResponse;
    const coins = body.coins ?? {};
    prices.native = coins[chain.llamaNative]?.price ?? null;
    for (const token of tokens) {
      const price = coins[`${chain.llamaChain}:${token.toLowerCase()}`]?.price;
      if (price !== undefined) prices.tokens.set(token.toLowerCase(), price);
    }
  } catch {
    // Prices are decoration: the facts stay correct without USD.
  }
  return prices;
}
