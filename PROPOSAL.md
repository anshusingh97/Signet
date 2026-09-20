# Product Proposal

## What is the product, and who uses it?
**Signet** is a zero-knowledge confidential credential verification protocol and gated-access platform built on Midnight. It allows users to prove they hold a genuine, qualified credential—such as a developer accreditation, KYC/AML tier, or organization membership—and that their credential meets or exceeds a required threshold, without ever disclosing the underlying credential secret, their identity, or their exact tier.

### Target Users:
1. **Resource Gatekeepers & DAOs:** Communities, developer programs, grant bodies, and private DeFi protocols that need to restrict access (e.g., private alpha channels, builder grants, exclusive voting rounds) to verified individuals without taking on the regulatory and security liabilities of storing personal identifiable information (PII) or credentials.
2. **Credential Holders (Builders & Users):** Developers, accredited participants, and community members who wish to claim access or submit actions based on their reputation or qualification without doxxing themselves, exposing their financial state, or allowing cross-application tracking.
3. **Issuers:** Trusted certification authorities, hackathons, academies, and identity providers who issue tamper-proof verifiable credentials that their users can present anywhere privately.

---

## Why Midnight specifically?
On conventional transparent blockchains (such as Ethereum, Cardano, or Solana), verifying a credential requires either:
1. Publishing the credential, signature, or user attribute on-chain, which permanently exposes private user details and enables wallet-tracking across services; or
2. Relying on an off-chain centralized verification server that checks credentials behind closed doors, re-introducing single points of failure, censorship, and data breach risks.

**Midnight uniquely solves this problem through its native zero-knowledge architecture and Compact smart contract language:**
- **Client-Side ZK Proving:** The credential secret and exact tier remain strictly on the user's device as private witnesses. The proof is generated locally before any transaction is submitted.
- **Selective Disclosure:** The Compact circuit proves a mathematical predicate (`tier >= requiredTier`) without revealing the actual tier value.
- **Double-Presentation Prevention (Nullifiers):** Midnight allows the circuit to derive a deterministic nullifier (`hash(secret)`) that is recorded on the public ledger. This guarantees Sybil resistance and prevents duplicate presentations at a specific gate without exposing the secret or linking the nullifier to the holder's wallet.
- **Verifiable Public State:** The ledger immutably tracks the gate configuration (resource name, minimum tier, total verified count) while preserving total confidentiality of participant identities.

---

## Data Model

| Data Point                       | Type            | Disclosed To |
|----------------------------------|-----------------|--------------|
| Gated Resource Name              | Public ledger   | Everyone     |
| Minimum Required Tier Threshold  | Public ledger   | Everyone     |
| Verified-Credential Counter      | Public ledger   | Everyone     |
| Spent Nullifier Set              | Public ledger   | Everyone (prevents double-presentation) |
| Credential Secret Key            | Private witness | No one (client-side only) |
| Holder's Exact Tier / Score      | Private witness | No one (client-side only) |
| Holder Identity & Wallet Link    | Private witness | No one (never written to ledger) |

---

## Mainnet Feasibility
**Yes, Signet is highly feasible to reach Mainnet by Level 6.**

1. **Current Foundation (Level 3):**
   - The Compact circuit and smart contract are written, compiled, tested, and actively deployed on Midnight Preprod (`d6258de4cb23f7ff1903f4903d0a8d682f108cd9da99a7e592739296ba80dc8c`).
   - The frontend dApp is deployed live with wallet connection (1AM Wallet), client-side balancing via Midnight DUST, real-time transaction tracking via the Preprod GraphQL indexer, and responsive UI.
   - Comprehensive test suite covering circuit logic, state transitions, and zero-knowledge privacy guarantees.

2. **Roadmap to Mainnet (Levels 4–6):**
   - **Level 4:** Implement multi-issuer signature verification inside the Compact contract (using cryptographic signatures / commitments to verify an issuer's stamp without revealing the issuer-holder link).
   - **Level 5:** Create a self-service gate creation dashboard for third-party communities, alongside an embeddable React widget (`@signet/react-gate`) for external dApps.
   - **Level 6 (Mainnet):** Formal verification of Compact circuits, smart contract audits, testnet-to-mainnet parameter tuning, and deployment onto the Midnight Mainnet.
