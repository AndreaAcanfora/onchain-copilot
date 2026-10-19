import { arbitrum, avalanche, base, mainnet, type Chain } from "viem/chains";

export const CHAIN_KEYS = ["ethereum", "base", "arbitrum", "avalanche"] as const;
export type ChainKey = (typeof CHAIN_KEYS)[number];

export const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

export interface ChainConfig {
  key: ChainKey;
  name: string;
  viem: Chain;
  rpcUrls: readonly string[];
  explorer: string;
  nativeSymbol: string;
  /** DefiLlama coins API prefix for tokens, and the coin id of the native asset. */
  llamaChain: string;
  llamaNative: string;
  /** WETH9-style wrapper: emits Deposit/Withdrawal instead of a Transfer when wrapping. */
  wrappedNative: `0x${string}`;
}

export const CHAINS: Record<ChainKey, ChainConfig> = {
  ethereum: {
    key: "ethereum",
    name: "Ethereum",
    viem: mainnet,
    rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://1rpc.io/eth"],
    explorer: "https://etherscan.io",
    nativeSymbol: "ETH",
    llamaChain: "ethereum",
    llamaNative: "coingecko:ethereum",
    wrappedNative: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  base: {
    key: "base",
    name: "Base",
    viem: base,
    rpcUrls: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
    explorer: "https://basescan.org",
    nativeSymbol: "ETH",
    llamaChain: "base",
    llamaNative: "coingecko:ethereum",
    wrappedNative: "0x4200000000000000000000000000000000000006",
  },
  arbitrum: {
    key: "arbitrum",
    name: "Arbitrum One",
    viem: arbitrum,
    rpcUrls: ["https://arb1.arbitrum.io/rpc", "https://arbitrum-one-rpc.publicnode.com"],
    explorer: "https://arbiscan.io",
    nativeSymbol: "ETH",
    llamaChain: "arbitrum",
    llamaNative: "coingecko:ethereum",
    wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  },
  avalanche: {
    key: "avalanche",
    name: "Avalanche C-Chain",
    viem: avalanche,
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain-rpc.publicnode.com"],
    explorer: "https://snowtrace.io",
    nativeSymbol: "AVAX",
    llamaChain: "avax",
    llamaNative: "coingecko:avalanche-2",
    wrappedNative: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
  },
};

export function isChainKey(value: string): value is ChainKey {
  return (CHAIN_KEYS as readonly string[]).includes(value);
}
