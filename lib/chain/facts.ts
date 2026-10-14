import type { ChainKey } from "./chains";

/** Everything the UI and the model know about a transaction. JSON-safe: big numbers are strings. */
export interface TxFacts {
  chain: ChainKey;
  hash: `0x${string}`;
  status: "success" | "reverted";
  blockNumber: string;
  timestamp: number;
  from: AddressRef;
  to: AddressRef | null;
  contractCreated: AddressRef | null;
  value: Amount;
  fee: Amount;
  gasUsed: string;
  call: DecodedCall | null;
  transfers: Transfer[];
  flows: Flow[];
  events: DecodedEvent[];
}

export interface AddressRef {
  address: `0x${string}`;
  label: string | null;
}

export interface Amount {
  raw: string;
  decimals: number;
  symbol: string;
  value: number;
  usd: number | null;
}

export type AbiSource = "verified" | "standard" | "signature" | "unknown";

export interface DecodedArg {
  name: string;
  type: string;
  value: string;
}

export interface DecodedCall {
  selector: `0x${string}`;
  functionName: string | null;
  signature: string | null;
  args: DecodedArg[];
  abiSource: AbiSource;
}

export interface TokenRef {
  address: `0x${string}`;
  symbol: string;
  name: string | null;
  decimals: number | null;
}

export type Transfer =
  | { kind: "native"; from: AddressRef; to: AddressRef; amount: Amount }
  | { kind: "erc20"; token: TokenRef; from: AddressRef; to: AddressRef; amount: Amount }
  | { kind: "nft"; standard: "erc721" | "erc1155"; token: TokenRef; from: AddressRef; to: AddressRef; tokenId: string; quantity: string };

/** Net change of one asset for one address over the whole transaction. */
export interface Flow {
  address: AddressRef;
  asset: string;
  amount: Amount | null;
  nftDelta: number | null;
}

export interface DecodedEvent {
  logIndex: number;
  emitter: AddressRef;
  name: string | null;
  signature: string | null;
  args: DecodedArg[];
  abiSource: AbiSource;
}

export type AnalyzeResult =
  | { kind: "ok"; facts: TxFacts }
  | { kind: "pending" }
  | { kind: "not_found" };
