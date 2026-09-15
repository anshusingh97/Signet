# Signet
![CI](https://github.com/anshusingh97/Signet/actions/workflows/ci.yml/badge.svg)
> Prove a credential is valid — and meets a threshold — without disclosing it.

## Live Demo
[LIVE URL — add after deploying, e.g. Vercel/Netlify]

## Contract Address
| Network  | Address                                                            |
|----------|--------------------------------------------------------------------|
| Preprod  | `5df7d1cab974f0ccff2bb80d7d9b1fe9cd1969a89b986b7a44d1358fb89f63d7` |

🔍 [View on Midnight Explorer](https://www.midnightexplorer.com/contract/5df7d1cab974f0ccff2bb80d7d9b1fe9cd1969a89b986b7a44d1358fb89f63d7)

## What This Does
Signet lets an issuer open a "gate" in front of some resource — a
private channel, a grant round, a voting pool — that requires a
credential at or above a given tier. Holders prove, in zero-knowledge,
that they hold a genuine credential from the trusted issuer meeting
that bar, without ever revealing the credential itself or exactly how
high their tier is above the minimum.

Pick a tier to simulate holding a credential, then present it at the
gate. The app walks through proof generation and shows the private
receipt that's the only trace your presentation leaves behind.

## Privacy Model
- **PUBLIC:** the gated resource's name, the minimum tier required, the
  running count of successful verifications, the set of spent
  credential nullifiers.
- **PRIVATE:** the credential secret, the holder's exact tier, and any
  link between a nullifier and the holder's identity.
- **PROVED without revealing:** that the caller holds a credential
  issued by the trusted issuer, at or above the gate's required tier,
  and has not presented it to this gate before — without revealing
  which credential it is, or its exact tier.

## Privacy Claim
An on-chain observer can see the exact number of credentials that have
cleared the gate at any moment, and can confirm no single credential
was used twice at that gate (the nullifier set only ever grows). What
they cannot see, at any point, is whose credential it was, its precise
tier — only that it met the threshold — or which nullifier ties back to
which holder. That link is never written to the ledger in the first
place.

## Tech Stack
- **Contract:** Compact (`contracts/credential.compact`) — Midnight's ZK
  smart contract language
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Wallet:** Lace (Midnight/Preprod connector)
- **Tests:** Vitest, mirroring the circuit's logic in TypeScript
- **CI/CD:** GitHub Actions

## Prerequisites
- Node.js v22+
- npm
- [Midnight `compact` CLI](https://docs.midnight.network) (for compiling
  the contract and deploying to Preprod)
- [Lace wallet](https://docs.midnight.network) browser extension, funded
  on Preprod, for live on-chain interaction

## Setup & Run Locally
```bash
# 1. Install dependencies
npm install

# 2. (Once the Midnight toolchain is installed) compile the contract
npm run compact:compile

# 3. Run the app
npm run dev
```
The app runs fully interactively against a local TypeScript simulator
(`src/lib/credentialSimulator.ts`) that mirrors the compiled circuit's
rules, so the UI can be reviewed before the contract is deployed to
Preprod. Once deployed, swap the simulator calls in `src/App.tsx` for
the generated Midnight.js contract bindings in `managed/credential`.

## Run Tests
```
npm test
```

## CI/CD
On every push and pull request to `main`, the GitHub Actions pipeline
(`.github/workflows/ci.yml`) checks out the code, installs dependencies
on Node 22, compiles the Compact contract when the toolchain is present,
lints, runs the full Vitest suite, and produces a production build —
failing the run if any step errors.

## Product Proposal
See [PROPOSAL.md](./PROPOSAL.md).
