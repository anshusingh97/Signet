import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";

// Simulation of the Signet Compact circuit state and verification rules
// Mirrors contracts/credential.compact for automated unit and privacy testing

interface LedgerState {
  resourceName: string;
  requiredTier: number;
  verifiedCount: number;
  usedNullifiers: Set<string>;
  gateOpen: boolean;
}

interface CredentialWitnesses {
  secret: string; // 32-byte hex string (private)
  tier: number;   // private integer
}

function computeNullifier(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

class SignetCircuitSimulator {
  ledger: LedgerState;

  constructor(initialTier = 3, resource = "Verified Builders Channel") {
    this.ledger = {
      resourceName: resource,
      requiredTier: initialTier,
      verifiedCount: 0,
      usedNullifiers: new Set<string>(),
      gateOpen: true,
    };
  }

  /**
   * Simulates the presentCredential circuit in contracts/credential.compact:
   * - Checks tier >= requiredTier
   * - Derives nullifier = hash(secret)
   * - Asserts nullifier is not already spent
   * - Records nullifier and increments verifiedCount
   * - Returns ONLY public outputs (nullifier, verifiedCount)
   */
  presentCredential(witnesses: CredentialWitnesses): {
    publicOutput: {
      nullifier: string;
      verifiedCount: number;
      gateName: string;
    };
  } {
    // 1. Circuit assertion: tier threshold check
    if (witnesses.tier < this.ledger.requiredTier) {
      throw new Error("credential tier is below the gate's requirement");
    }

    // 2. Circuit derivation: deterministic nullifier
    const nullifier = computeNullifier(witnesses.secret);

    // 3. Circuit assertion: double-presentation prevention
    if (this.ledger.usedNullifiers.has(nullifier)) {
      throw new Error("credential already presented at this gate");
    }

    // 4. Ledger state transition
    this.ledger.usedNullifiers.add(nullifier);
    this.ledger.verifiedCount += 1;

    // 5. Return strictly public outputs (private secret & exact tier stay concealed)
    return {
      publicOutput: {
        nullifier,
        verifiedCount: this.ledger.verifiedCount,
        gateName: this.ledger.resourceName,
      },
    };
  }
}

describe("Signet Smart Contract & Circuit Verification", () => {
  let sim: SignetCircuitSimulator;

  beforeEach(() => {
    sim = new SignetCircuitSimulator(3, "Verified Builders Channel");
  });

  // --------------------------------------------------------------------------
  // a) Circuit Logic Test
  // --------------------------------------------------------------------------
  describe("a) Circuit logic", () => {
    it("should accept valid credentials meeting or exceeding the required tier", () => {
      const validWitness = {
        secret: crypto.randomBytes(32).toString("hex"),
        tier: 4, // Tier 4 >= Required 3
      };

      const res = sim.presentCredential(validWitness);
      expect(res.publicOutput.nullifier).toBeDefined();
      expect(res.publicOutput.nullifier.length).toBe(64);
    });

    it("should reject credentials below the required tier", () => {
      const underTierWitness = {
        secret: crypto.randomBytes(32).toString("hex"),
        tier: 2, // Tier 2 < Required 3
      };

      expect(() => sim.presentCredential(underTierWitness)).toThrow(
        "credential tier is below the gate's requirement"
      );
    });
  });

  // --------------------------------------------------------------------------
  // b) State Transitions Test
  // --------------------------------------------------------------------------
  describe("b) State transitions", () => {
    it("should correctly increment verifiedCount on successful presentation", () => {
      expect(sim.ledger.verifiedCount).toBe(0);

      const witness1 = {
        secret: crypto.randomBytes(32).toString("hex"),
        tier: 3,
      };
      sim.presentCredential(witness1);
      expect(sim.ledger.verifiedCount).toBe(1);

      const witness2 = {
        secret: crypto.randomBytes(32).toString("hex"),
        tier: 5,
      };
      sim.presentCredential(witness2);
      expect(sim.ledger.verifiedCount).toBe(2);
    });

    it("should prevent replay attacks by disallowing presenting the same credential twice", () => {
      const secret = crypto.randomBytes(32).toString("hex");
      const witness = { secret, tier: 3 };

      // First presentation succeeds
      sim.presentCredential(witness);
      expect(sim.ledger.verifiedCount).toBe(1);

      // Replay attempt with same secret fails
      expect(() => sim.presentCredential(witness)).toThrow(
        "credential already presented at this gate"
      );
      // Counter must not increment on failed presentation
      expect(sim.ledger.verifiedCount).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // c) Privacy Verification Test
  // --------------------------------------------------------------------------
  describe("c) Privacy model & zero-knowledge guarantee", () => {
    it("should never expose private secret or exact tier in the public outputs or ledger state", () => {
      const privateSecret = "e7b1a293c84f5012d6a3b4c5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5";
      const privateExactTier = 5; // Gate only requires Tier 3

      const { publicOutput } = sim.presentCredential({
        secret: privateSecret,
        tier: privateExactTier,
      });

      // 1. The public output must NOT contain the secret
      const serializedOutput = JSON.stringify(publicOutput);
      expect(serializedOutput).not.toContain(privateSecret);

      // 2. The public output must NOT contain the exact tier
      expect(publicOutput).not.toHaveProperty("tier");
      expect((publicOutput as Record<string, unknown>).tier).toBeUndefined();

      // 3. The ledger state must only record the one-way nullifier hash, never the secret
      expect(sim.ledger.usedNullifiers.has(privateSecret)).toBe(false);
      const expectedNullifier = computeNullifier(privateSecret);
      expect(sim.ledger.usedNullifiers.has(expectedNullifier)).toBe(true);

      // 4. An observer cannot reverse the nullifier to find the secret
      expect(publicOutput.nullifier).toBe(expectedNullifier);
      expect(publicOutput.nullifier).not.toEqual(privateSecret);
    });
  });
});
