// credentialSimulator.ts
//
// A pure-TypeScript mirror of contracts/credential.compact. Lets the UI
// run fully interactively before `compact compile` + Preprod deployment,
// and lets tests/credential.test.ts exercise the same rules the circuit
// enforces (issuance membership, tier threshold, nullifier reuse) without
// the Midnight toolchain.
//
// Nothing here ever stores a credential's exact tier or serial once
// issued — only:
//   - the set of issued leaf hashes (stands in for the issuer's Merkle tree)
//   - the set of spent nullifiers (public)
//   - the running verified-count (public)
// mirroring exactly what the real ledger would hold.

export interface GateState {
  resourceName: string;
  requiredTier: number;
  issuedLeaves: Set<string>;
  usedNullifiers: Set<string>;
  verifiedCount: number;
  gateOpen: boolean;
}

export interface PresentResult {
  ok: boolean;
  error?: string;
  nullifier?: string;
}

async function hash(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function openGate(resourceName: string, requiredTier: number): GateState {
  if (requiredTier < 1 || requiredTier > 5) {
    throw new Error("required tier must be between 1 and 5");
  }
  return {
    resourceName,
    requiredTier,
    issuedLeaves: new Set(),
    usedNullifiers: new Set(),
    verifiedCount: 0,
    gateOpen: true,
  };
}

// Issuance: happens off-chain, at the moment a trusted issuer grants a
// holder a credential. We just record the leaf the circuit will later
// check membership of — never the (secret, tier) pair itself.
export async function issueCredential(
  gate: GateState,
  secret: string,
  tier: number
) {
  const leaf = await hash(`${secret}:${tier}`);
  gate.issuedLeaves.add(leaf);
  return leaf;
}

// Mirrors circuit `presentCredential`.
export async function presentCredential(
  gate: GateState,
  secret: string,
  tier: number
): Promise<PresentResult> {
  if (!gate.gateOpen) return { ok: false, error: "This gate is closed." };

  if (tier < gate.requiredTier) {
    return {
      ok: false,
      error: `Credential does not meet the required tier (Tier ${gate.requiredTier}+).`,
    };
  }

  const leaf = await hash(`${secret}:${tier}`);
  if (!gate.issuedLeaves.has(leaf)) {
    return { ok: false, error: "This credential was not issued by the trusted issuer." };
  }

  const nullifier = await hash(`${secret}:${gate.resourceName}`);
  if (gate.usedNullifiers.has(nullifier)) {
    return { ok: false, error: "This credential has already been presented at this gate." };
  }

  gate.usedNullifiers.add(nullifier);
  gate.verifiedCount += 1;

  return { ok: true, nullifier };
}

export function closeGate(gate: GateState) {
  if (!gate.gateOpen) throw new Error("already closed");
  gate.gateOpen = false;
}
