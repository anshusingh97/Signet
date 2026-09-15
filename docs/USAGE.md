# Usage notes

## Circuit walkthrough (`contracts/credential.compact`)

- `openGate(name, minTier, root)` — issuer/resource owner opens a gate,
  naming the resource, the minimum credential tier required, and
  publishing the Merkle root of every `(secret, tier)` leaf it has
  issued.
- `presentCredential()` — a holder supplies three private witnesses
  (`credentialSecret`, `credentialTier`, `credentialPath`). The circuit
  checks `tier >= requiredTier` without disclosing `tier`, proves
  membership of `hash(secret, tier)` against `issuerRoot`, derives a
  gate-scoped nullifier, checks it hasn't been spent, then increments
  only the public `verifiedCount`.
- `closeGate()` — freezes further presentations without altering past
  verifications.

## Going from simulator to deployed contract

1. Install the Midnight `compact` CLI and run
   `npm run compact:compile` — this populates `managed/credential` with
   the generated TypeScript bindings and verifier keys.
2. Replace the calls into `src/lib/credentialSimulator.ts` inside
   `src/App.tsx` with calls into the generated `managed/credential`
   contract client (see Midnight.js docs for `deployContract` /
   `findDeployedContract`).
3. Deploy to Preprod, record the contract address, and add it to the
   README's Contract Address table.
4. Fund a Preprod test wallet in Lace and connect it from the header.

## Manual steps still required before submission

- [ ] Compile the contract and deploy to Preprod
- [ ] Add the real Preprod contract address to `README.md`
- [ ] Fill in every `[I WILL FILL THIS IN]` section of `PROPOSAL.md`
- [ ] Submit the chosen idea (Confidential Credentials) for approval
- [ ] Record the 1-minute demo video (see checklist below)
- [ ] Make 10+ meaningful, incremental commits
- [ ] Deploy the frontend (e.g. Vercel/Netlify) and add the live URL

## Demo video checklist
1. Full flow: connect Lace wallet → issue credential → present at gate →
   see the verified stamp and ledger count update
2. Terminal showing `npm test` output (12 passing)
3. README showing the green CI badge
