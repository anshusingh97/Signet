import { GateState } from "../lib/credentialSimulator";

export function VerificationLedger({ gate }: { gate: GateState }) {
  return (
    <div className="border border-paper/12 rounded-sm p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="font-display text-lg text-paper">Verification ledger</h3>
        <span className="font-mono text-[11px] text-paper/40">live · on-chain</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-3xl text-verdigris-light">{gate.verifiedCount}</p>
          <p className="text-xs text-paper/50 mt-1">credentials verified</p>
        </div>
        <div>
          <p className="font-mono text-3xl text-paper/70">{gate.requiredTier}+</p>
          <p className="text-xs text-paper/50 mt-1">minimum tier required</p>
        </div>
      </div>

      <p className="font-mono text-[11px] text-paper/35 mt-5 pt-5 border-t border-paper/10">
        {gate.usedNullifiers.size} spent credential nullifier
        {gate.usedNullifiers.size === 1 ? "" : "s"} · gate is{" "}
        {gate.gateOpen ? "open" : "closed"}
      </p>
    </div>
  );
}
