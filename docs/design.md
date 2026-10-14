# Onchain Copilot: design + implementation plan

## Context

Andrea is job hunting (Web3 frontend/product roles and AI product-engineering roles, balanced, slight AI tilt). His strongest CV line is the Snowtrace AI assistant (streaming chat, tool calls over live on-chain data), but none of it is public: his GitHub shows only `hyperliquid-quant-stack` and `iron-arena`. This new public repo proves the AI + Web3 skill set with a live demo, written from scratch on public data (no Routescan code).

Decisions already taken with Andrea:
- Audience: Web3 and AI roles together, slight AI tilt.
- Cost: **zero**. Free LLM tiers only (Gemini Flash primary, Groq fallback), plus recorded "replay" conversations that cost nothing.
- Scope: **transaction explainer** + light address context. Natural language to wallet-signed tx is deferred to phase 2.
- Chains: Ethereum, Base, Arbitrum, Avalanche C-Chain.
- Budget: 1-2 weeks (~30-40h). Evals are the first follow-up after v1.
- Architecture: **hybrid**. Deterministic `analyzeTransaction` for the first answer; 2 focused tools for follow-ups, with a step cap.

Success: a recruiter opens the demo and sees a correct, good-looking explanation within 30s, even with zero LLM quota left; an engineer reads the README and finds real decisions (facts vs narrative, provider fallback, replay-based e2e).

## Product

Landing: hash input + chain selector + 5 curated example txs (famous Uniswap swap, a bridge, an NFT mint, a failed tx, an Avalanche tx). Examples open as **replays** (recorded stream, no quota). Any other hash goes live.

An answer is a streamed narrative plus generative UI cards rendered from facts:
- `TxSummaryCard`: status, chain, from/to (labels, ENS), value, fee in native + USD, timestamp.
- `TokenFlow`: per-address net in/out of ERC-20/721/1155 + native, USD where priced.
- `DecodedCall`: function name + args of the top-level call, ABI source (verified / signature guess).
- `EventList`: decoded logs, collapsible.

Follow-up chat ("who is 0x...?", "what else did this wallet do today?") uses the follow-up tools. Footer line discloses the free-tier model.

## Repo and conventions (mirror hyperliquid-quant-stack)

New public repo `AndreaAcanfora/onchain-copilot` (name to confirm at scaffold), MIT, cloned at `~/Documents/GitHub/onchain-copilot`. The design (this file) is copied into the repo as `docs/design.md` in milestone 1. Single Next.js app (no monorepo: nothing here is worth publishing to npm in v1).
- pnpm 11 pinned via `packageManager`, `"type": "module"`, Node 22 in CI.
- Next 16 + React 19 + Tailwind v4 via `@tailwindcss/postcss`, tokens in an `@theme` block in `app/globals.css`, fonts via `next/font` (as in `apps/lab/app/globals.css`, `apps/lab/app/layout.tsx`).
- TS strict + `noUncheckedIndexedAccess`, `@/*` alias (copy from `tsconfig.base.json` + `apps/lab/tsconfig.json`).
- ESLint flat config spreading `eslint-config-next` (copy `apps/lab/eslint.config.mjs`).
- Vitest 3 for unit, `test/**/*.test.ts` (`apps/lab/vitest.config.ts`).
- Playwright `desktop` + `mobile` (Pixel 7) projects on a prod build, port 3100, axe via `@axe-core/playwright` filtering serious/critical (copy `apps/lab/playwright.config.ts`, pattern in `apps/lab/e2e/lab.spec.ts`).
- CI `.github/workflows/ci.yml`: `check` job (typecheck, lint, test) + `e2e` job uploading `test-results` on failure (copy structure from the quant-stack `ci.yml`).
- Committed fixtures so e2e and build need no network (same idea as `data/daily-snapshot.json`).
- Reuse: `useWidth` (`apps/lab/lib/use-width.ts`), reduced-motion + `:focus-visible` CSS from `apps/lab/app/globals.css`, `pct` style formatter (`apps/lab/lib/lab.ts:73`) as model for a new `formatUsd` / `formatToken`.
- README in the same order: title, badges, pitch, bold **Live demo**, hero image/GIF, `## What's inside` (table + mermaid), case-study section ("Why the model never does math": facts vs narrative), `## Graceful degradation` (provider fallback + replay), `## Run it`, `## What's not here`, `## License`. Images in `docs/img/`.

## Architecture

```
app/
  page.tsx                     landing (RSC)
  tx/[chain]/[hash]/page.tsx   explanation view (RSC shell + client chat)
  api/chat/route.ts            streamText, tools, provider fallback, rate limit
lib/chain/                     pure, framework-free, unit-tested
  chains.ts                    4 chain configs (viem chain, public RPC list, explorer URL)
  client.ts                    publicClient per chain, viem fallback() transport
  analyze-transaction.ts       tx + receipt + block -> TxFacts
  abi-sources.ts               Sourcify -> Etherscan V2 (chains still free) -> signature DB (openchain/4byte)
  decode-logs.ts               Transfer/Swap/Approval decoding, unknown logs kept raw
  tokens.ts                    multicall name/symbol/decimals, cached
  prices.ts                    DefiLlama coins API, historical at block time (free, no key)
  labels.ts                    ENS reverse (mainnet) + small curated labels JSON per chain
lib/ai/
  providers.ts                 Gemini Flash -> Groq on 429/5xx; typed quota_exhausted when both fail
  tools.ts                     analyzeTransaction, describeAddress, recentActivity (zod)
  system-prompt.ts             never compute numbers, cite facts, choose cards
  replay/                      recorder + player for UI message streams; fixtures/*.json
components/cards/              the 4 generative UI cards (render TxFacts, never LLM numbers)
```

Key rules:
1. **Facts vs narrative**: tools return typed `TxFacts`; cards render facts; the model only writes prose and picks cards. Numbers in prose must come from facts (system prompt now, evals later).
2. **Step cap**: `stopWhen: stepCountIs(4)`; the first turn forces `analyzeTransaction` via `toolChoice`.
3. **Provider fallback**: wrapper tries Gemini, on 429/quota falls to Groq, then returns `quota_exhausted` and the UI offers replays.
4. **Rate limit**: per IP, ~10 live questions/day. Upstash Redis free tier if env is set, in-memory otherwise (dev).
5. **Caching**: a finalized tx is immutable, so cache analysis by `chainId:hash` (Next data cache); repeat hashes cost zero RPC.
6. **Facts without the LLM**: the tx page calls `analyzeTransaction` server-side and renders cards immediately; the LLM narrative streams in on top. If the LLM is unavailable, the page is still useful.

## Data flow

hash + chain -> `/tx/[chain]/[hash]` -> RSC runs `analyzeTransaction` (cached) and renders cards -> client starts chat with facts in context -> `/api/chat` -> rate limit -> provider wrapper -> narrative streams -> follow-ups may call `describeAddress` / `recentActivity` (bounded by the step cap).

Replay: example routes load `lib/ai/replay/fixtures/<id>.json` and feed the recorded UI message stream to the same components with realistic timing. Same code path as live, so replays double as e2e fixtures.

## Error handling

- Invalid hash -> validated before any network call. Not found on the chosen chain -> probe the other 3 chains in parallel and suggest the right one.
- Pending tx -> say it's pending, no LLM call.
- RPC failure -> viem `fallback()` across public RPCs, then a friendly error.
- ABI not found -> signature DB guess, marked "unverified" in `DecodedCall`.
- Price missing -> native amount only, no USD (never invent).
- LLM quota exhausted / provider down -> cards still render (rule 6), narrative replaced by a notice + replay links. **The demo never shows an empty screen.**

## Testing

- Unit (Vitest): `lib/chain/*` against recorded RPC fixtures for ~10 real txs across the 4 chains (swap, bridge, NFT, failed, contract creation, proxy contract, native transfer). Provider wrapper with fake providers (429 -> fallback -> quota_exhausted).
- E2E (Playwright desktop + mobile + axe): landing, each replay example, invalid/not-found hash, quota-exhausted path (env flag). No live LLM or RPC in CI.
- CI: typecheck, lint, unit, e2e. Vercel preview per PR.
- Phase 2 (after v1): eval golden set asserting the narrative mentions the right tokens/amounts from facts.

## Milestones (each one an atomic commit set, deployable)

1. Scaffold with conventions above + CI + Vercel deploy of an empty app.
2. `lib/chain` analysis with recorded fixtures + unit tests (no AI yet).
3. Cards + `/tx/[chain]/[hash]` rendering facts only (already useful on its own).
4. `/api/chat` with Gemini: streaming narrative over facts.
5. Groq fallback, rate limit, quota-exhausted UX.
6. Follow-up tools (`describeAddress`, `recentActivity`) + step cap.
7. Replay recorder/player + 5 curated examples + Playwright e2e.
8. Landing polish, README + GIF, pin on GitHub profile, add the project to CV and profile README.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` green locally and in CI.
- Manual on the Vercel URL: open each replay example; paste 1 live tx per chain; ask 2 follow-ups; force `quota_exhausted` via env flag and confirm cards still render with replay links.
- Before launch: read the live free-tier limits on the Gemini (AI Studio) and Groq dashboards; confirm Etherscan free coverage (Base and Avalanche left the free tier in Nov 2025, so Sourcify + signature DB must carry them).

## Accounts Andrea must create (free)

Google AI Studio API key, Groq API key, Vercel project, optional Upstash Redis, optional Etherscan API key.
