import { createPublicClient, custom, type PublicClient } from "viem";
import { CHAINS, type ChainKey } from "./chains";
import { createClient, fetchJson, type ChainDeps } from "./deps";

/** Every network response one analysis needed, keyed by request. Lets tests replay real transactions offline. */
export interface Recording {
  chain: ChainKey;
  hash: `0x${string}`;
  rpc: Record<string, unknown>;
  ensRpc: Record<string, unknown>;
  http: Record<string, { body: unknown } | { error: string }>;
}

const rpcKey = (method: string, params: unknown) => JSON.stringify([method, params ?? []]);

function recordingClient(key: ChainKey, live: PublicClient, store: Record<string, unknown>): PublicClient {
  return createPublicClient({
    chain: CHAINS[key].viem,
    transport: custom({
      async request({ method, params }) {
        const result = await live.request({ method, params } as never);
        store[rpcKey(method, params)] = result;
        return result;
      },
    }),
  }) as PublicClient;
}

export function recordingDeps(recording: Recording): ChainDeps {
  return {
    client: recordingClient(recording.chain, createClient(recording.chain), recording.rpc),
    ensClient: recordingClient("ethereum", createClient("ethereum"), recording.ensRpc),
    async fetchJson(url) {
      try {
        const body = await fetchJson(url);
        recording.http[url] = { body };
        return body;
      } catch (error) {
        recording.http[url] = { error: String(error) };
        throw error;
      }
    },
  };
}

function replayClient(key: ChainKey, store: Record<string, unknown>): PublicClient {
  return createPublicClient({
    chain: CHAINS[key].viem,
    transport: custom({
      async request({ method, params }) {
        const id = rpcKey(method, params);
        if (!(id in store)) throw new Error(`No recorded RPC response for ${id}`);
        return store[id];
      },
    }, { retryCount: 0 }),
  }) as PublicClient;
}

export function replayDeps(recording: Recording): ChainDeps {
  return {
    client: replayClient(recording.chain, recording.rpc),
    ensClient: replayClient("ethereum", recording.ensRpc),
    async fetchJson(url) {
      const entry = recording.http[url];
      if (!entry) throw new Error(`No recorded HTTP response for ${url}`);
      if ("error" in entry) throw new Error(entry.error);
      return entry.body;
    },
  };
}
