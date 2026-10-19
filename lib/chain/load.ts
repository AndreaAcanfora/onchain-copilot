import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";
import type { Hex } from "viem";
import { analyzeTransaction } from "./analyze-transaction";
import { CHAIN_KEYS, type ChainKey } from "./chains";
import { createClient, liveDeps, type ChainDeps } from "./deps";
import type { AnalyzeResult } from "./facts";
import { replayDeps, type Recording } from "./recording";

/**
 * E2E_FIXTURES=1 serves recorded transactions instead of the network, so the
 * Playwright suite runs against a production build with no RPC access.
 */
const fixtureMode = () => process.env.E2E_FIXTURES === "1";

async function fixtureDeps(chain: ChainKey, hash: Hex): Promise<ChainDeps | null> {
  const dir = path.join(process.cwd(), "test/fixtures");
  for (const file of await readdir(dir)) {
    const recording = JSON.parse(await readFile(path.join(dir, file), "utf8")) as Recording;
    if (recording.chain === chain && recording.hash.toLowerCase() === hash.toLowerCase()) return replayDeps(recording);
  }
  return null;
}

class NotFinal extends Error {
  constructor(readonly result: AnalyzeResult) {
    super(result.kind);
  }
}

// A mined transaction never changes, so its facts are cached for good. Pending and
// not-found answers throw out of the cache scope instead, because they will change.
const cachedAnalysis = unstable_cache(
  async (chain: ChainKey, hash: Hex): Promise<AnalyzeResult> => {
    const result = await analyzeTransaction(liveDeps(chain), chain, hash);
    if (result.kind !== "ok") throw new NotFinal(result);
    return result;
  },
  ["analyze-transaction-v1"],
  { revalidate: false },
);

export async function loadTransaction(chain: ChainKey, hash: Hex): Promise<AnalyzeResult> {
  if (fixtureMode()) {
    const deps = await fixtureDeps(chain, hash);
    return deps ? analyzeTransaction(deps, chain, hash) : { kind: "not_found" };
  }
  try {
    return await cachedAnalysis(chain, hash.toLowerCase() as Hex);
  } catch (error) {
    if (error instanceof NotFinal) return error.result;
    throw error;
  }
}

/** Chains other than `chain` where this hash exists, for the "wrong network?" hint. */
export async function findOnOtherChains(chain: ChainKey, hash: Hex): Promise<ChainKey[]> {
  if (fixtureMode()) return [];
  const others = CHAIN_KEYS.filter((key) => key !== chain);
  const hits = await Promise.all(
    others.map((key) =>
      createClient(key)
        .getTransaction({ hash })
        .then(() => key)
        .catch(() => null),
    ),
  );
  return hits.filter((key): key is ChainKey => key !== null);
}
