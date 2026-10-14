import { getAddress, type Address } from "viem";
import type { ChainDeps } from "./deps";
import type { TokenRef } from "./facts";
import { TOKEN_METADATA_ABI } from "./standard-abi";

/** symbol/name/decimals for every token in one multicall; tokens that revert still get a readable ref. */
export async function fetchTokens(deps: ChainDeps, addresses: Address[]): Promise<Map<string, TokenRef>> {
  const tokens = new Map<string, TokenRef>();
  if (addresses.length === 0) return tokens;

  const calls = addresses.flatMap((address) =>
    (["symbol", "name", "decimals"] as const).map((functionName) => ({ address, abi: TOKEN_METADATA_ABI, functionName })),
  );
  const results = await deps.client.multicall({ contracts: calls, allowFailure: true });

  addresses.forEach((address, i) => {
    const [symbol, name, decimals] = results.slice(i * 3, i * 3 + 3);
    const checksummed = getAddress(address);
    tokens.set(address.toLowerCase(), {
      address: checksummed,
      symbol: symbol?.status === "success" ? String(symbol.result) : `${checksummed.slice(0, 6)}…`,
      name: name?.status === "success" ? String(name.result) : null,
      decimals: decimals?.status === "success" ? Number(decimals.result) : null,
    });
  });
  return tokens;
}
