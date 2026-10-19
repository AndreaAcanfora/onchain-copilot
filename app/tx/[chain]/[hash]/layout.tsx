import { notFound } from "next/navigation";
import { isChainKey, TX_HASH } from "@/lib/chain/chains";

// Validates the URL outside loading.tsx's Suspense boundary: a notFound() thrown
// after streaming has started would ship as a 200, this one is a real 404.
export default async function TxLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ chain: string; hash: string }>;
}) {
  const { chain, hash } = await params;
  if (!isChainKey(chain) || !TX_HASH.test(hash)) notFound();
  return children;
}
