import {
  decodeEventLog,
  decodeFunctionData,
  encodeFunctionData,
  parseAbiItem,
  toEventSelector,
  toFunctionSelector,
  type Abi,
  type AbiEvent,
  type AbiFunction,
  type AbiParameter,
  type Hex,
  type Log,
} from "viem";
import type { AbiSource, DecodedArg } from "./facts";
import { COMMON_EVENTS, ERC1155_EVENTS, ERC20_EVENTS, ERC721_EVENTS } from "./standard-abi";

export type LogMatch = "erc20" | "erc721" | "erc1155" | "common" | "verified" | "signature" | "none";

export interface DecodedLog {
  match: LogMatch;
  name: string | null;
  signature: string | null;
  args: DecodedArg[];
  /** Raw decoded values keyed by param name, for building transfers. */
  values: Record<string, unknown>;
  abiSource: AbiSource;
}

export function stringifyValue(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return value;
  return JSON.stringify(value, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v));
}

function signatureOf(item: AbiEvent | AbiFunction): string {
  return `${item.name}(${item.inputs.map((i) => i.type).join(",")})`;
}

function toArgs(inputs: readonly AbiParameter[], args: unknown): { args: DecodedArg[]; values: Record<string, unknown> } {
  const values: Record<string, unknown> = {};
  const list = inputs.map((input, i) => {
    const name = input.name || `arg${i}`;
    const value = Array.isArray(args) ? args[i] : (args as Record<string, unknown> | undefined)?.[name];
    values[name] = value;
    return { name, type: input.type, value: stringifyValue(value) };
  });
  return { args: list, values };
}

function tryDecodeEvent(abi: Abi, log: Pick<Log, "data" | "topics">): { item: AbiEvent; args: unknown } | null {
  const topic0 = log.topics[0];
  if (!topic0) return null;
  for (const item of abi) {
    if (item.type !== "event" || toEventSelector(item) !== topic0) continue;
    try {
      const decoded = decodeEventLog({ abi: [item], data: log.data, topics: log.topics as [Hex, ...Hex[]], strict: true });
      return { item, args: decoded.args };
    } catch {
      // Same selector, different indexed layout (ERC-20 vs ERC-721 Transfer): try the next candidate.
    }
  }
  return null;
}

const STANDARD: [LogMatch, Abi][] = [
  ["erc20", ERC20_EVENTS],
  ["erc721", ERC721_EVENTS],
  ["erc1155", ERC1155_EVENTS],
  ["common", COMMON_EVENTS],
];

export function decodeLog(
  log: Pick<Log, "data" | "topics">,
  verifiedAbi: Abi | null,
  eventSignatures: Record<Hex, string[]>,
): DecodedLog {
  const candidates: [LogMatch, Abi][] = verifiedAbi ? [...STANDARD, ["verified", verifiedAbi]] : STANDARD;
  for (const [match, abi] of candidates) {
    const hit = tryDecodeEvent(abi, log);
    if (!hit) continue;
    const { args, values } = toArgs(hit.item.inputs, hit.args);
    return {
      match,
      name: hit.item.name,
      signature: signatureOf(hit.item),
      args,
      values,
      abiSource: match === "verified" ? "verified" : "standard",
    };
  }

  const topic0 = log.topics[0];
  const signature = topic0 ? eventSignatures[topic0]?.[0] : undefined;
  if (signature) {
    // A text signature does not say which params are indexed, so only the name is trustworthy.
    return { match: "signature", name: signature.split("(")[0] ?? null, signature, args: [], values: {}, abiSource: "signature" };
  }
  return { match: "none", name: null, signature: null, args: [], values: {}, abiSource: "unknown" };
}

export interface DecodedInput {
  functionName: string | null;
  signature: string | null;
  args: DecodedArg[];
  abiSource: AbiSource;
}

/**
 * `exact` demands that re-encoding the decoded args reproduces the calldata byte for byte.
 * Signature databases are full of vanity collisions (a zero-arg `Brrrr...()` "decodes"
 * any calldata with the same selector), so guessed signatures must pass it.
 */
function tryDecodeCall(abi: Abi, input: Hex, exact: boolean): DecodedInput | null {
  const selector = input.slice(0, 10);
  const item = abi.find((i): i is AbiFunction => i.type === "function" && toFunctionSelector(i) === selector);
  if (!item) return null;
  try {
    const decoded = decodeFunctionData({ abi: [item], data: input });
    if (exact) {
      const reencoded = encodeFunctionData({ abi: [item], functionName: item.name, args: decoded.args ?? [] });
      if (reencoded.toLowerCase() !== input.toLowerCase()) return null;
    }
    return { functionName: item.name, signature: signatureOf(item), args: toArgs(item.inputs, decoded.args).args, abiSource: "verified" };
  } catch {
    return null;
  }
}

export function decodeCall(input: Hex, verifiedAbi: Abi | null, functionSignatures: Record<Hex, string[]>): DecodedInput {
  if (verifiedAbi) {
    const hit = tryDecodeCall(verifiedAbi, input, false);
    if (hit) return hit;
  }
  const selector = input.slice(0, 10) as Hex;
  for (const signature of functionSignatures[selector] ?? []) {
    try {
      const item = parseAbiItem(`function ${signature}`) as AbiFunction;
      const hit = tryDecodeCall([item], input, true);
      if (hit) return { ...hit, abiSource: "signature" };
    } catch {
      // Unparseable or colliding signature: try the next candidate.
    }
  }
  return { functionName: null, signature: null, args: [], abiSource: "unknown" };
}
