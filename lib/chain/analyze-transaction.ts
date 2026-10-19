import {
  formatUnits,
  getAddress,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  type Address,
  type Hex,
  type Log,
  type TransactionReceipt,
} from "viem";
import { fetchVerifiedContract, lookupSignatures, type VerifiedContract } from "./abi-sources";
import { CHAINS, type ChainConfig, type ChainKey } from "./chains";
import { decodeCall, decodeLog, type DecodedLog } from "./decode";
import type { ChainDeps } from "./deps";
import type { AddressRef, Amount, AnalyzeResult, DecodedCall, DecodedEvent, Flow, TokenRef, Transfer, TxFacts } from "./facts";
import { resolveLabels } from "./labels";
import { fetchPrices, type Prices } from "./prices";
import { fetchTokens } from "./tokens";

const ZERO = "0x0000000000000000000000000000000000000000";
/** Sourcify lookups for emitters whose events no standard ABI decodes. Bounded so a 300-log tx stays fast. */
const MAX_EMITTER_LOOKUPS = 8;

const RECEIPT_ATTEMPTS = 3;

const lower = (address: string) => address.toLowerCase();

/**
 * A mined transaction always has a receipt, so "not found" here is a node lying:
 * public endpoints load-balance across nodes and some answer null. viem's fallback
 * transport treats null as an answer, so the retry has to live here.
 */
async function getMinedReceipt(deps: ChainDeps, hash: Hex): Promise<TransactionReceipt> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await deps.client.getTransactionReceipt({ hash });
    } catch (error) {
      if (!(error instanceof TransactionReceiptNotFoundError) || attempt >= RECEIPT_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }
}
const unique = <T>(items: T[]) => [...new Set(items)];

function amount(raw: bigint, decimals: number, symbol: string, price: number | null): Amount {
  const value = Number(formatUnits(raw, decimals));
  return { raw: raw.toString(), decimals, symbol, value, usd: price === null ? null : value * price };
}

interface PendingTransfer {
  kind: "native" | "erc20" | "erc721" | "erc1155";
  token: Address | null;
  from: Address;
  to: Address;
  raw: bigint;
  tokenId?: bigint;
}

function transfersFromLog(log: Log, decoded: DecodedLog, chain: ChainConfig): PendingTransfer[] {
  const v = decoded.values;
  const token = log.address;
  if (decoded.match === "erc20" && decoded.name === "Transfer") {
    return [{ kind: "erc20", token, from: v.from as Address, to: v.to as Address, raw: v.value as bigint }];
  }
  if (decoded.match === "erc721" && decoded.name === "Transfer") {
    return [{ kind: "erc721", token, from: v.from as Address, to: v.to as Address, raw: 1n, tokenId: v.tokenId as bigint }];
  }
  if (decoded.match === "erc1155" && decoded.name === "TransferSingle") {
    return [
      { kind: "erc1155", token, from: v.from as Address, to: v.to as Address, raw: v.value as bigint, tokenId: v.id as bigint },
    ];
  }
  if (decoded.match === "erc1155" && decoded.name === "TransferBatch") {
    const ids = v.ids as bigint[];
    const values = v.values as bigint[];
    return ids.map((id, i) => ({
      kind: "erc1155" as const,
      token,
      from: v.from as Address,
      to: v.to as Address,
      raw: values[i] ?? 0n,
      tokenId: id,
    }));
  }
  // WETH9 wraps and unwraps without emitting Transfer; model them as mint/burn so flows add up.
  if (decoded.match === "common" && lower(token) === lower(chain.wrappedNative)) {
    if (decoded.name === "Deposit") return [{ kind: "erc20", token, from: ZERO, to: v.dst as Address, raw: v.wad as bigint }];
    if (decoded.name === "Withdrawal") return [{ kind: "erc20", token, from: v.src as Address, to: ZERO, raw: v.wad as bigint }];
  }
  return [];
}

async function decodeAll(
  deps: ChainDeps,
  chain: ChainConfig,
  to: Address | null,
  input: Hex,
  logs: Log[],
): Promise<{ call: DecodedCall | null; decodedLogs: DecodedLog[]; contracts: Map<string, VerifiedContract> }> {
  const standardPass = logs.map((log) => decodeLog(log, null, {}));
  const unknownEmitters = unique(logs.filter((_, i) => standardPass[i]?.match === "none").map((l) => lower(l.address)));
  const toFetch = unique([...(to ? [lower(to)] : []), ...unknownEmitters.slice(0, MAX_EMITTER_LOOKUPS)]);

  const contracts = new Map<string, VerifiedContract>();
  await Promise.all(
    toFetch.map(async (address) => {
      const contract = await fetchVerifiedContract(deps, chain.viem.id, address as Address);
      if (contract) contracts.set(address, contract);
    }),
  );

  let decodedLogs = logs.map((log, i) => {
    const first = standardPass[i]!;
    return first.match === "none" ? decodeLog(log, contracts.get(lower(log.address))?.abi ?? null, {}) : first;
  });

  const hasCall = input.length >= 10;
  const toAbi = to ? (contracts.get(lower(to))?.abi ?? null) : null;
  let decodedInput = hasCall ? decodeCall(input, toAbi, {}) : null;

  const missingTopics = unique(
    logs.filter((_, i) => decodedLogs[i]?.match === "none").flatMap((l) => (l.topics[0] ? [l.topics[0]] : [])),
  );
  const missingSelectors = decodedInput?.abiSource === "unknown" ? [input.slice(0, 10) as Hex] : [];
  if (missingTopics.length || missingSelectors.length) {
    const signatures = await lookupSignatures(deps, { functions: missingSelectors, events: missingTopics });
    decodedLogs = logs.map((log, i) => {
      const current = decodedLogs[i]!;
      return current.match === "none" ? decodeLog(log, null, signatures.events) : current;
    });
    if (decodedInput?.abiSource === "unknown") decodedInput = decodeCall(input, null, signatures.functions);
  }

  const call = decodedInput ? { selector: input.slice(0, 10) as Hex, ...decodedInput } : null;
  return { call, decodedLogs, contracts };
}

function buildFlows(transfers: Transfer[], from: Address): Flow[] {
  const byKey = new Map<string, { address: AddressRef; asset: string; raw: bigint; template: Amount | null; usdPerUnit: number | null; nft: number }>();
  const touch = (ref: AddressRef, asset: string, template: Amount | null) => {
    const key = `${lower(ref.address)}|${asset}`;
    let entry = byKey.get(key);
    if (!entry) {
      const usdPerUnit = template && template.usd !== null && template.value !== 0 ? template.usd / template.value : null;
      entry = { address: ref, asset, raw: 0n, template, usdPerUnit, nft: 0 };
      byKey.set(key, entry);
    }
    return entry;
  };

  for (const t of transfers) {
    if (t.kind === "nft") {
      const asset = `${t.token.symbol} #`;
      const qty = Number(t.quantity);
      touch(t.from, asset, null).nft -= qty;
      touch(t.to, asset, null).nft += qty;
      continue;
    }
    const asset = t.kind === "native" ? t.amount.symbol : t.token.symbol;
    const raw = BigInt(t.amount.raw);
    touch(t.from, asset, t.amount).raw -= raw;
    touch(t.to, asset, t.amount).raw += raw;
  }

  const flows: Flow[] = [];
  for (const e of byKey.values()) {
    if (lower(e.address.address) === ZERO) continue;
    if (e.template) {
      if (e.raw === 0n) continue;
      const value = Number(formatUnits(e.raw, e.template.decimals));
      flows.push({
        address: e.address,
        asset: e.asset,
        amount: {
          raw: e.raw.toString(),
          decimals: e.template.decimals,
          symbol: e.template.symbol,
          value,
          usd: e.usdPerUnit === null ? null : value * e.usdPerUnit,
        },
        nftDelta: null,
      });
    } else if (e.nft !== 0) {
      flows.push({ address: e.address, asset: e.asset, amount: null, nftDelta: e.nft });
    }
  }

  const isSender = (f: Flow) => lower(f.address.address) === lower(from);
  return flows.sort((a, b) => {
    if (isSender(a) !== isSender(b)) return isSender(a) ? -1 : 1;
    return Math.abs(b.amount?.usd ?? 0) - Math.abs(a.amount?.usd ?? 0);
  });
}

export async function analyzeTransaction(deps: ChainDeps, key: ChainKey, hash: Hex): Promise<AnalyzeResult> {
  const chain = CHAINS[key];
  const { client } = deps;

  let tx;
  try {
    tx = await client.getTransaction({ hash });
  } catch (error) {
    if (error instanceof TransactionNotFoundError) return { kind: "not_found" };
    throw error;
  }
  if (tx.blockNumber === null) return { kind: "pending" };

  const [receipt, block] = await Promise.all([
    getMinedReceipt(deps, hash),
    client.getBlock({ blockNumber: tx.blockNumber }),
  ]);
  const timestamp = Number(block.timestamp);
  const { call, decodedLogs, contracts } = await decodeAll(deps, chain, tx.to, tx.input, receipt.logs);

  const pending: PendingTransfer[] = [];
  const recipient = tx.to ?? receipt.contractAddress;
  if (tx.value > 0n && recipient) pending.push({ kind: "native", token: null, from: tx.from, to: recipient, raw: tx.value });
  receipt.logs.forEach((log, i) => pending.push(...transfersFromLog(log, decodedLogs[i]!, chain)));

  const fungible = unique(pending.filter((p) => p.kind === "erc20").map((p) => lower(p.token!))) as Address[];
  const nfts = unique(pending.filter((p) => p.kind === "erc721" || p.kind === "erc1155").map((p) => lower(p.token!))) as Address[];
  const [tokens, prices] = await Promise.all([
    fetchTokens(deps, unique([...fungible, ...nfts]) as Address[]),
    fetchPrices(deps, chain, timestamp, fungible),
  ]);

  const participants = unique(
    [tx.from, tx.to, receipt.contractAddress, ...pending.flatMap((p) => [p.from, p.to]), ...receipt.logs.map((l) => l.address)]
      .filter((a): a is Address => !!a)
      .map(lower),
  ) as Address[];
  const contractNames = new Map([...contracts].flatMap(([address, c]) => (c.name ? [[address, c.name] as const] : [])));
  const labels = await resolveLabels(deps, key, participants, contractNames);
  const ref = (address: Address): AddressRef => ({ address: getAddress(address), label: labels.get(lower(address)) ?? null });

  const transfers = pending.map((p) => toTransfer(p, chain, tokens, prices, ref));
  const l1Fee = (receipt as { l1Fee?: bigint | null }).l1Fee ?? 0n;
  const feeRaw = receipt.gasUsed * receipt.effectiveGasPrice + l1Fee;

  const events: DecodedEvent[] = receipt.logs.map((log, i) => {
    const decoded = decodedLogs[i]!;
    return {
      logIndex: log.logIndex ?? i,
      emitter: ref(log.address),
      name: decoded.name,
      signature: decoded.signature,
      args: decoded.args,
      abiSource: decoded.abiSource,
    };
  });

  const facts: TxFacts = {
    chain: key,
    hash,
    status: receipt.status,
    blockNumber: receipt.blockNumber.toString(),
    timestamp,
    from: ref(tx.from),
    to: tx.to ? ref(tx.to) : null,
    contractCreated: receipt.contractAddress ? ref(receipt.contractAddress) : null,
    value: amount(tx.value, chain.viem.nativeCurrency.decimals, chain.nativeSymbol, prices.native),
    fee: amount(feeRaw, chain.viem.nativeCurrency.decimals, chain.nativeSymbol, prices.native),
    gasUsed: receipt.gasUsed.toString(),
    call,
    transfers,
    flows: buildFlows(transfers, tx.from),
    events,
  };
  return { kind: "ok", facts };
}

function toTransfer(
  p: PendingTransfer,
  chain: ChainConfig,
  tokens: Map<string, TokenRef>,
  prices: Prices,
  ref: (a: Address) => AddressRef,
): Transfer {
  const from = ref(p.from);
  const to = ref(p.to);
  if (p.kind === "native") {
    return { kind: "native", from, to, amount: amount(p.raw, chain.viem.nativeCurrency.decimals, chain.nativeSymbol, prices.native) };
  }
  const token = tokens.get(lower(p.token!)) ?? { address: getAddress(p.token!), symbol: "???", name: null, decimals: null };
  if (p.kind === "erc20") {
    return {
      kind: "erc20",
      token,
      from,
      to,
      amount: amount(p.raw, token.decimals ?? 0, token.symbol, prices.tokens.get(lower(token.address)) ?? null),
    };
  }
  return { kind: "nft", standard: p.kind, token, from, to, tokenId: (p.tokenId ?? 0n).toString(), quantity: p.raw.toString() };
}
