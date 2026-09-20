import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";

// Simulation of the Signet / Midnight Circuit and Counter State Transitions
// Covers the required 3 test categories for Level 3:
// a) Circuit logic — does the circuit compute correctly?
// b) State transitions — does ledger state update as expected?
// c) Privacy — private input is never exposed in any output

interface CounterLedgerState {
  verifiedCount: number;
  threshold: number;
  spentNullifiers: Set<string>;
}

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

class CounterCircuitSimulator {
  ledger: CounterLedgerState;

  constructor(threshold = 1) {
    this.ledger = {
      verifiedCount: 0,
      threshold,
      spentNullifiers: new Set<string>(),
    };
  }

  incrementWithProof(privateSecret: string, privateValue: number): {
    publicOutput: {
      nullifier: string;
      newCount: number;
    };
  } {
    // a) Circuit logic validation: privateValue must meet or exceed threshold
    if (privateValue < this.ledger.threshold) {
      throw new Error("Private value is below threshold");
    }

    const nullifier = hashSecret(privateSecret);

    // Assert not double-spent
    if (this.ledger.spentNullifiers.has(nullifier)) {
      throw new Error("Proof already spent");
    }

    // b) Ledger state transition
    this.ledger.spentNullifiers.add(nullifier);
    this.ledger.verifiedCount += 1;

    // c) Privacy guarantee: only return public nullifier and new counter
    return {
      publicOutput: {
        nullifier,
        newCount: this.ledger.verifiedCount,
      },
    };
  }
}

describe("Counter & Circuit Verification Tests", () => {
  let sim: CounterCircuitSimulator;

  beforeEach(() => {
    sim = new CounterCircuitSimulator(1);
  });

  // a) Circuit logic test
  it("a) Circuit logic: should compute and accept valid proof when value meets threshold", () => {
    const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const result = sim.incrementWithProof(secret, 2);
    expect(result.publicOutput.nullifier).toBe(hashSecret(secret));
    expect(result.publicOutput.newCount).toBe(1);

    // Should reject if value does not meet threshold
    expect(() => sim.incrementWithProof("another_secret", 0)).toThrow(
      "Private value is below threshold"
    );
  });

  // b) State transitions test
  it("b) State transitions: ledger state counter increments and double-spends are rejected", () => {
    expect(sim.ledger.verifiedCount).toBe(0);

    const secret1 = "secret_1_00000000000000000000000000000000000000000000000000000000";
    sim.incrementWithProof(secret1, 1);
    expect(sim.ledger.verifiedCount).toBe(1);

    const secret2 = "secret_2_00000000000000000000000000000000000000000000000000000000";
    sim.incrementWithProof(secret2, 3);
    expect(sim.ledger.verifiedCount).toBe(2);

    // Double spend rejection
    expect(() => sim.incrementWithProof(secret1, 1)).toThrow("Proof already spent");
    expect(sim.ledger.verifiedCount).toBe(2);
  });

  // c) Privacy test
  it("c) Privacy: private witness secret and value are never revealed in public outputs or ledger", () => {
    const secret = "super_private_witness_secret_99999999999999999999999999999999999";
    const privateValue = 42;

    const { publicOutput } = sim.incrementWithProof(secret, privateValue);

    // Public output check
    expect(JSON.stringify(publicOutput)).not.toContain(secret);
    expect(JSON.stringify(publicOutput)).not.toContain("42");
    expect((publicOutput as Record<string, unknown>).privateValue).toBeUndefined();

    // Ledger state check
    expect(sim.ledger.spentNullifiers.has(secret)).toBe(false);
    expect(sim.ledger.spentNullifiers.has(hashSecret(secret))).toBe(true);
  });
});
