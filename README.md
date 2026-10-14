# Onchain Copilot

[![CI](https://github.com/AndreaAcanfora/onchain-copilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreaAcanfora/onchain-copilot/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Paste a transaction hash from Ethereum, Base, Arbitrum or Avalanche and get a plain-English explanation:
decoded calls, token flows and fees, narrated by an AI that never does the math.

Work in progress. The design is in [docs/design.md](docs/design.md).

## Run it

```bash
pnpm install
cp .env.example .env.local   # optional for now
pnpm dev                     # http://localhost:3000
pnpm test                    # unit tests
pnpm test:e2e                # Playwright on a production build, desktop + mobile + axe
```

## License

[MIT](LICENSE)
