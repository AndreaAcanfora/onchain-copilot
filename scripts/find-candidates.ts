import { createClient } from "../lib/chain/deps";
import { CHAIN_KEYS, isChainKey } from "../lib/chain/chains";

// Dev helper: scans recent blocks and prints one tx hash per shape, to pick fixture candidates.
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const keys = process.argv[2] && isChainKey(process.argv[2]) ? [process.argv[2]] : CHAIN_KEYS;

for (const key of keys) {
  const client = createClient(key);
  const latest = await client.getBlockNumber();
  const found: Record<string, string> = {};
  for (let n = latest - 5n; n > latest - 40n && Object.keys(found).length < 6; n--) {
    const block = await client.getBlock({ blockNumber: n, includeTransactions: true });
    const receipts = await client.request({ method: "eth_getBlockReceipts" as never, params: [`0x${n.toString(16)}`] as never }).catch(() => null) as
      | { transactionHash: string; status: string; logs: { topics: string[] }[]; contractAddress: string | null }[]
      | null;
    if (!receipts) continue;
    for (const [i, tx] of block.transactions.entries()) {
      const r = receipts[i];
      if (!r) continue;
      if (!found.reverted && r.status === "0x0") found.reverted = tx.hash;
      if (!found.creation && r.contractAddress) found.creation = tx.hash;
      if (!found.native && tx.input === "0x" && tx.value > 0n) found.native = tx.hash;
      if (!found.nft && r.logs.some((l) => l.topics[0] === TRANSFER && l.topics.length === 4) && r.logs.length < 12) found.nft = tx.hash;
      const erc20 = r.logs.filter((l) => l.topics[0] === TRANSFER && l.topics.length === 3).length;
      if (!found.swap && erc20 >= 2 && erc20 <= 4 && r.logs.length <= 10) found.swap = tx.hash;
      if (!found.erc20 && erc20 === 1 && r.logs.length === 1 && tx.input.startsWith("0xa9059cbb")) found.erc20 = tx.hash;
    }
  }
  console.log(key, JSON.stringify(found, null, 1));
}
