import type { ChainKey } from "./chain/chains";

/** Real transactions, also recorded under test/fixtures so they work in E2E with no network. */
export const EXAMPLES: { chain: ChainKey; hash: `0x${string}`; title: string }[] = [
  { chain: "ethereum", hash: "0x28d29eb5b12c2c57dcc445e2b9a38615e76d7232a7e96d485198071d8b199b3c", title: "A USDT payment" },
  { chain: "base", hash: "0xe041ad030d2871826ae443f9df52c5767159baa2ece9c7c65a19dbbb399e154c", title: "An NFT mint on Base" },
  { chain: "avalanche", hash: "0x3c0f2430b3c496a936cc614c35af822b8ce1abd59b6734e9402ba3558a8f9e5a", title: "A bot trade on Avalanche" },
  { chain: "ethereum", hash: "0x941d73b6dfc986a6d11d72c9aada4daeaca15c500357c47924757c298378bad9", title: "A transaction that failed" },
];
