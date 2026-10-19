import { describe, expect, it } from "vitest";
import { headline } from "../lib/headline";
import { analyzeFixture } from "./fixtures";

describe("headline", () => {
  it("summarizes a native transfer as a send", async () => {
    expect(headline(await analyzeFixture("ethereum-native"))).toBe("Sent 0.02301 ETH to 0x3402…cf1e");
  });

  it("summarizes a single token transfer as a send", async () => {
    expect(headline(await analyzeFixture("ethereum-usdt-transfer"))).toBe("Sent 54 USDT to 0x78fA…DB8b");
  });

  it("calls a mint a mint", async () => {
    expect(headline(await analyzeFixture("base-nft-mint"))).toBe("Minted BRZ #7912339");
  });

  it("names the failure for a reverted transaction", async () => {
    expect(headline(await analyzeFixture("ethereum-reverted"))).toBe("Failed call to 0xa993…4c85");
  });

  it("names the new contract on a deployment", async () => {
    expect(headline(await analyzeFixture("ethereum-creation"))).toBe("Deployed contract 0xdA30…24F5");
  });

  it("falls back to the function name when the sender's role is unclear", async () => {
    expect(headline(await analyzeFixture("arbitrum-swap"))).toBe("Called handleOps on EntryPoint");
  });

  it("admits an unverified function instead of guessing", async () => {
    expect(headline(await analyzeFixture("avalanche-swap"))).toBe("Called an unverified function on 0x278d…F8D2");
  });
});
