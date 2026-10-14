import { readFileSync } from "node:fs";
import { analyzeTransaction } from "../lib/chain/analyze-transaction";
import type { TxFacts } from "../lib/chain/facts";
import { replayDeps, type Recording } from "../lib/chain/recording";

export function loadRecording(name: string): Recording {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8")) as Recording;
}

export async function analyzeFixture(name: string): Promise<TxFacts> {
  const recording = loadRecording(name);
  const result = await analyzeTransaction(replayDeps(recording), recording.chain, recording.hash);
  if (result.kind !== "ok") throw new Error(`${name} replayed as ${result.kind}`);
  return result.facts;
}
