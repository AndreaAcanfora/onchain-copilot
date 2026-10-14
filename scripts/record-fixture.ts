import { mkdir, writeFile } from "node:fs/promises";
import type { Hex } from "viem";
import { analyzeTransaction } from "../lib/chain/analyze-transaction";
import { isChainKey } from "../lib/chain/chains";
import { recordingDeps, type Recording } from "../lib/chain/recording";

// pnpm exec tsx scripts/record-fixture.ts <chain> <hash> <name>
// Runs one live analysis and saves every network response to test/fixtures/<name>.json.
const [chain, hash, name] = process.argv.slice(2);
if (!chain || !isChainKey(chain) || !hash || !name) throw new Error("usage: record-fixture.ts <chain> <hash> <name>");

const recording: Recording = { chain, hash: hash as Hex, rpc: {}, ensRpc: {}, http: {} };
const result = await analyzeTransaction(recordingDeps(recording), chain, hash as Hex);
if (result.kind !== "ok") throw new Error(`${hash} is ${result.kind}`);

await mkdir("test/fixtures", { recursive: true });
await writeFile(`test/fixtures/${name}.json`, `${JSON.stringify(recording, null, 1)}\n`);
console.log(`recorded ${name}: ${Object.keys(recording.rpc).length} rpc, ${Object.keys(recording.http).length} http`);
