import { describe, it, expect } from "vitest";
import {
  openGate,
  issueCredential,
  presentCredential,
  closeGate,
} from "../src/lib/credentialSimulator";

describe("circuit logic — openGate / presentCredential", () => {
  it("initializes verifiedCount to zero and the gate to open", () => {
    const gate = openGate("Verified Builders Channel", 2);
    expect(gate.verifiedCount).toBe(0);
    expect(gate.gateOpen).toBe(true);
  });

  it("increments verifiedCount when a valid, sufficiently-tiered credential is presented", async () => {
    const gate = openGate("Verified Builders Channel", 2);
    await issueCredential(gate, "holder-a-secret", 3);
    const result = await presentCredential(gate, "holder-a-secret", 3);

    expect(result.ok).toBe(true);
    expect(gate.verifiedCount).toBe(1);
  });

  it("rejects a credential presented with the wrong tier for its issuance (mismatched leaf)", async () => {
    const gate = openGate("Verified Builders Channel", 2);
    await issueCredential(gate, "holder-a-secret", 3);
    // Presenting with a different tier than was issued changes the leaf hash.
    const result = await presentCredential(gate, "holder-a-secret", 4);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not issued/i);
  });
});

describe("state transitions — threshold proof, nullifiers, gate lifecycle", () => {
  it("rejects a credential below the gate's required tier", async () => {
    const gate = openGate("Verified Builders Channel", 4);
    await issueCredential(gate, "holder-a-secret", 2);
    const result = await presentCredential(gate, "holder-a-secret", 2);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/does not meet the required tier/i);
    expect(gate.verifiedCount).toBe(0);
  });

  it("accepts a credential exactly at the required tier (boundary)", async () => {
    const gate = openGate("Verified Builders Channel", 3);
    await issueCredential(gate, "holder-a-secret", 3);
    const result = await presentCredential(gate, "holder-a-secret", 3);

    expect(result.ok).toBe(true);
  });

  it("rejects a credential that was never issued (no membership proof)", async () => {
    const gate = openGate("Verified Builders Channel", 1);
    const result = await presentCredential(gate, "never-issued-secret", 5);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not issued/i);
  });

  it("rejects a second presentation of the same credential at the same gate (nullifier reuse)", async () => {
    const gate = openGate("Verified Builders Channel", 1);
    await issueCredential(gate, "holder-a-secret", 5);

    const first = await presentCredential(gate, "holder-a-secret", 5);
    const second = await presentCredential(gate, "holder-a-secret", 5);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/already been presented/i);
    expect(gate.verifiedCount).toBe(1);
  });

  it("allows the same credential to be presented once at two different gates (nullifier is gate-scoped)", async () => {
    const gateA = openGate("Verified Builders Channel", 1);
    const gateB = openGate("Grant Review Room", 1);
    await issueCredential(gateA, "holder-a-secret", 5);
    await issueCredential(gateB, "holder-a-secret", 5);

    const atA = await presentCredential(gateA, "holder-a-secret", 5);
    const atB = await presentCredential(gateB, "holder-a-secret", 5);

    expect(atA.ok).toBe(true);
    expect(atB.ok).toBe(true);
    expect(atA.nullifier).not.toBe(atB.nullifier);
  });

  it("refuses new presentations once the gate is closed, but preserves verifiedCount", async () => {
    const gate = openGate("Verified Builders Channel", 1);
    await issueCredential(gate, "holder-a-secret", 5);
    await presentCredential(gate, "holder-a-secret", 5);
    closeGate(gate);

    await issueCredential(gate, "holder-b-secret", 5);
    const late = await presentCredential(gate, "holder-b-secret", 5);

    expect(gate.gateOpen).toBe(false);
    expect(late.ok).toBe(false);
    expect(late.error).toMatch(/closed/i);
    expect(gate.verifiedCount).toBe(1);
  });
});

describe("privacy — no credential-to-holder or exact-tier linkage is ever recorded", () => {
  it("the nullifier does not equal or embed the raw credential secret", async () => {
    const gate = openGate("Verified Builders Channel", 1);
    await issueCredential(gate, "holder-a-secret", 5);
    const result = await presentCredential(gate, "holder-a-secret", 5);

    expect(result.nullifier).toBeDefined();
    expect(result.nullifier).not.toBe("holder-a-secret");
    expect(result.nullifier).not.toContain("holder-a-secret");
    expect(result.nullifier).toMatch(/^[0-9a-f]{64}$/);
  });

  it("GateState never exposes a holder's exact tier or identity, only aggregates", () => {
    const gate = openGate("Verified Builders Channel", 2);
    const keys = Object.keys(gate);
    expect(keys).toEqual(
      expect.arrayContaining([
        "resourceName",
        "requiredTier",
        "issuedLeaves",
        "usedNullifiers",
        "verifiedCount",
        "gateOpen",
      ])
    );
    expect(keys).not.toContain("holderTiers");
    expect(keys).not.toContain("holderIdentities");
    expect(keys).not.toContain("credentialLog");
  });

  it("two holders with different exact tiers, both above the threshold, produce indistinguishable outcomes on-chain", async () => {
    const gate = openGate("Verified Builders Channel", 2);
    await issueCredential(gate, "holder-a-secret", 2);
    await issueCredential(gate, "holder-b-secret", 5);

    const a = await presentCredential(gate, "holder-a-secret", 2);
    const b = await presentCredential(gate, "holder-b-secret", 5);

    // Both succeed and both only ever move the same public counter —
    // nothing on the gate records which holder had which tier.
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(gate.verifiedCount).toBe(2);
  });
});
