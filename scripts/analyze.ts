import type { Hex } from "viem";
import { analyzeTransaction } from "../lib/chain/analyze-transaction";
import { isChainKey } from "../lib/chain/chains";
import { liveDeps } from "../lib/chain/deps";

// Dev helper: pnpm exec tsx scripts/analyze.ts <chain> <hash>
const [chain, hash] = process.argv.slice(2);
if (!chain || !isChainKey(chain) || !hash) throw new Error("usage: analyze.ts <ethereum|base|arbitrum|avalanche> <hash>");
console.log(JSON.stringify(await analyzeTransaction(liveDeps(chain), chain, hash as Hex), null, 2));
