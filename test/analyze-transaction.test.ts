import { createPublicClient, custom, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import { describe, expect, it } from "vitest";
import { analyzeTransaction } from "../lib/chain/analyze-transaction";
import type { ChainDeps } from "../lib/chain/deps";
import type { Flow, TxFacts } from "../lib/chain/facts";
import { analyzeFixture, loadRecording } from "./fixtures";
import { replayDeps } from "../lib/chain/recording";

const flowOf = (facts: TxFacts, address: string, asset: string): Flow | undefined =>
  facts.flows.find((f) => f.address.address.toLowerCase() === address.toLowerCase() && f.asset === asset);

describe("analyzeTransaction on recorded mainnet transactions", () => {
  it("prices a native ETH transfer at the block's historical price", async () => {
    const facts = await analyzeFixture("ethereum-native");
    expect(facts.status).toBe("success");
    expect(facts.call).toBeNull();
    expect(facts.value).toMatchObject({ raw: "23010980000000000", symbol: "ETH", value: 0.02301098 });
    expect(facts.value.usd).toBeCloseTo(57.64, 2);
    expect(facts.transfers).toHaveLength(1);
    expect(flowOf(facts, facts.from.address, "ETH")?.amount?.value).toBe(-0.02301098);
  });

  it("decodes a USDT transfer through the verified ABI and keeps 6 decimals", async () => {
    const facts = await analyzeFixture("ethereum-usdt-transfer");
    expect(facts.to?.label).toBe("TetherToken");
    expect(facts.call).toMatchObject({ functionName: "transfer", abiSource: "verified" });
    expect(facts.call?.args.map((a) => a.name)).toEqual(["_to", "_value"]);
    const [transfer] = facts.transfers;
    expect(transfer).toMatchObject({ kind: "erc20", token: { symbol: "USDT", decimals: 6 }, amount: { raw: "54000000", value: 54 } });
    expect(facts.events.map((e) => e.abiSource)).toEqual(["standard"]);
  });

  it("nets out a multi-token swap per address", async () => {
    const facts = await analyzeFixture("ethereum-swap");
    expect(facts.transfers.filter((t) => t.kind === "erc20")).toHaveLength(4);
    const angstrom = facts.to!.address;
    // In 0.6985 WETH, out 1.1918 WETH: the net is the difference, not either leg.
    expect(flowOf(facts, angstrom, "WETH")?.amount?.value).toBeCloseTo(-0.4933002147583127, 12);
    expect(flowOf(facts, angstrom, "USDC")?.amount?.value).toBeCloseTo(2987.609517, 6);
    expect(facts.events.some((e) => e.abiSource === "unknown")).toBe(true);
  });

  it("reports a creation with the new contract and no call", async () => {
    const facts = await analyzeFixture("ethereum-creation");
    expect(facts.to).toBeNull();
    expect(facts.contractCreated?.address).toBe("0xdA308C2DA611030c35646466E2edAEAF930324F5");
  });

  it("marks a reverted transaction and still charges the fee", async () => {
    const facts = await analyzeFixture("ethereum-reverted");
    expect(facts.status).toBe("reverted");
    expect(facts.transfers).toEqual([]);
    expect(facts.fee.value).toBeGreaterThan(0);
  });
});

describe("analyzeTransaction on L2s and Avalanche", () => {
  it("shows an NFT mint as one token arriving from the null address", async () => {
    const facts = await analyzeFixture("base-nft-mint");
    expect(facts.call).toMatchObject({ functionName: "safeMint", abiSource: "verified" });
    expect(facts.transfers[0]).toMatchObject({ kind: "nft", standard: "erc721", from: { label: "Null address" }, tokenId: "7912339" });
    expect(flowOf(facts, facts.from.address, "BRZ #")?.nftDelta).toBe(1);
  });

  it("includes the L1 data fee in a Base transaction's fee", async () => {
    const facts = await analyzeFixture("base-swap");
    const receiptKey = Object.keys(loadRecording("base-swap").rpc).find((k) => k.includes("eth_getTransactionReceipt"))!;
    const receipt = loadRecording("base-swap").rpc[receiptKey] as { gasUsed: string; effectiveGasPrice: string; l1Fee: string };
    const execution = BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice);
    expect(BigInt(receipt.l1Fee)).toBeGreaterThan(0n);
    expect(BigInt(facts.fee.raw)).toBe(execution + BigInt(receipt.l1Fee));
  });

  it("does not label a proxy with its generic proxy contract name", async () => {
    const facts = await analyzeFixture("base-swap");
    expect(facts.to?.label).toBeNull();
  });

  it("decodes an account-abstraction bundle on Arbitrum", async () => {
    const facts = await analyzeFixture("arbitrum-swap");
    expect(facts.to?.label).toBe("EntryPoint");
    expect(facts.call?.functionName).toBe("handleOps");
    expect(facts.events.filter((e) => e.abiSource === "verified").length).toBeGreaterThan(0);
  });

  it("refuses a vanity signature that only matches the selector", async () => {
    const facts = await analyzeFixture("avalanche-swap");
    expect(facts.call).toMatchObject({ functionName: null, abiSource: "unknown" });
    expect(facts.transfers.map((t) => (t.kind === "erc20" ? t.token.symbol : t.kind))).toEqual(["WAVAX", "WETH.e", "WETH.e"]);
  });

  it("uses AVAX as the native asset on Avalanche", async () => {
    const facts = await analyzeFixture("avalanche-native");
    expect(facts.value.symbol).toBe("AVAX");
    expect(facts.fee.symbol).toBe("AVAX");
  });
});

function stubDeps(transaction: unknown): ChainDeps {
  const client = createPublicClient({
    chain: mainnet,
    transport: custom({ request: async () => transaction }, { retryCount: 0 }),
  }) as PublicClient;
  return { client, fetchJson: async () => ({}) };
}

describe("analyzeTransaction edge states", () => {
  const hash = "0x28d29eb5b12c2c57dcc445e2b9a38615e76d7232a7e96d485198071d8b199b3c";

  it("returns not_found when the node does not know the hash", async () => {
    expect(await analyzeTransaction(stubDeps(null), "ethereum", hash)).toEqual({ kind: "not_found" });
  });

  it("returns pending for a transaction without a block", async () => {
    const pendingTx = {
      hash,
      blockNumber: null,
      blockHash: null,
      transactionIndex: null,
      from: "0xaA8ba7D4611437141192e7ceCed531Bc0A133efb",
      to: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      value: "0x0",
      input: "0x",
      gas: "0x5208",
      gasPrice: "0x1",
      nonce: "0x0",
      type: "0x0",
      v: "0x1b",
      r: "0x1",
      s: "0x1",
    };
    expect(await analyzeTransaction(stubDeps(pendingTx), "ethereum", hash)).toEqual({ kind: "pending" });
  });
});

describe("analyzeTransaction against a flaky load-balanced RPC", () => {
  it("retries a missing receipt for a mined transaction instead of failing", async () => {
    const recording = loadRecording("ethereum-usdt-transfer");
    const deps = replayDeps(recording);
    let receiptCalls = 0;
    const flaky = createPublicClient({
      chain: mainnet,
      transport: custom(
        {
          async request(args: { method: string; params?: unknown }) {
            // Some nodes behind a public endpoint answer null for a receipt they should have.
            if (args.method === "eth_getTransactionReceipt" && receiptCalls++ === 0) return null;
            return deps.client.request(args as never);
          },
        },
        { retryCount: 0 },
      ),
    }) as PublicClient;

    const result = await analyzeTransaction({ ...deps, client: flaky }, "ethereum", recording.hash);
    expect(result.kind).toBe("ok");
    expect(receiptCalls).toBe(2);
  });
});
