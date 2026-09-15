import { useState } from "react";
import { GateState, issueCredential, presentCredential } from "../lib/credentialSimulator";

type Phase = "unissued" | "ready" | "proving" | "done" | "error";

const TIERS = [1, 2, 3, 4, 5];

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function CredentialCard({
  gate,
  onVerified,
}: {
  gate: GateState;
  onVerified: () => void;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [tier, setTier] = useState<number>(3);
  const [issuedTier, setIssuedTier] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("unissued");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleIssue() {
    const s = randomSecret();
    setSecret(s);
    await issueCredential(gate, s, tier);
    setIssuedTier(tier);
    setPhase("ready");
  }

  async function handlePresent() {
    if (!secret || issuedTier === null) return;
    setPhase("proving");
    setErrorMsg(null);
    await new Promise((r) => setTimeout(r, 900));
    const result = await presentCredential(gate, secret, issuedTier);
    if (result.ok) {
      setReceipt(result.nullifier!.slice(0, 16));
      setPhase("done");
      onVerified();
    } else {
      setErrorMsg(result.error ?? "Credential could not be verified.");
      setPhase("error");
    }
  }

  if (!gate.gateOpen && phase !== "done") {
    return (
      <div className="guilloche bg-graphite-light border border-paper/10 rounded-sm p-8 text-center">
        <p className="font-display text-lg text-paper">This gate has closed.</p>
        <p className="text-sm text-paper/50 mt-1">
          Verifications already recorded remain valid.
        </p>
      </div>
    );
  }

  return (
    <div className="guilloche bg-graphite-light border border-paper/10 rounded-sm overflow-hidden">
      <div className="p-8">
        <p className="font-mono text-[11px] tracking-wide text-paper/45">
          gate · {gate.resourceName}
        </p>
        <h2 className="font-display text-2xl text-paper mt-1 mb-1">
          {gate.resourceName}
        </h2>
        <p className="text-sm text-paper/50 mb-6">
          Requires a credential at Tier {gate.requiredTier} or above.
        </p>

        {phase === "unissued" && (
          <div className="space-y-4">
            <p className="text-sm text-paper/70 leading-relaxed">
              Simulate holding a credential from the trusted issuer. Choose
              the tier it was issued at — this value stays on your device
              and is never disclosed, even when it clears the gate.
            </p>
            <div className="flex gap-2">
              {TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`flex-1 font-mono text-sm rounded-sm py-2.5 border transition-colors ${
                    tier === t
                      ? "border-brass text-brass-light bg-brass/10"
                      : "border-paper/15 text-paper/60 hover:border-paper/30"
                  }`}
                >
                  T{t}
                </button>
              ))}
            </div>
            <button
              onClick={handleIssue}
              className="w-full font-mono text-sm bg-paper text-graphite rounded-sm py-3 hover:bg-paper/90 transition-colors"
            >
              issue credential
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4">
            <div className="foil-stamp rounded-sm p-[1px]">
              <div className="bg-graphite-light rounded-sm px-4 py-3 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 12l5 5L20 6"
                    stroke="#6BC2A8"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm font-medium text-paper">
                  Credential verified — access granted.
                </span>
              </div>
            </div>
            <div className="border border-paper/12 rounded-sm p-4 bg-graphite/40">
              <p className="text-[11px] text-paper/45 mb-1">your private receipt</p>
              <p className="font-mono text-sm text-paper/80 break-all">{receipt}…</p>
              <p className="text-[11px] text-paper/40 mt-2 leading-relaxed">
                This proves a valid credential cleared the gate. It reveals
                neither your exact tier nor which credential it was — only
                that one, once, met the requirement.
              </p>
            </div>
          </div>
        )}

        {(phase === "ready" || phase === "proving" || phase === "error") && (
          <div className="space-y-4">
            <div className="border border-paper/12 rounded-sm px-4 py-3 flex items-center justify-between bg-graphite/40">
              <span className="text-sm text-paper/70">Holding a credential</span>
              <span className="font-mono text-xs text-paper/40">tier withheld</span>
            </div>

            {errorMsg && (
              <p className="text-sm text-brass-light border border-brass/30 bg-brass/5 rounded-sm px-3 py-2">
                {errorMsg}
              </p>
            )}

            <button
              onClick={handlePresent}
              disabled={phase === "proving"}
              className="w-full font-mono text-sm bg-verdigris text-graphite-deep rounded-sm py-3.5 hover:bg-verdigris-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {phase === "proving" ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-graphite-deep/30 border-t-graphite-deep animate-spin" />
                  generating proof…
                </>
              ) : (
                "prove & present credential"
              )}
            </button>
          </div>
        )}
      </div>

      <div className="px-8 py-3 bg-graphite/40 border-t border-paper/10 flex justify-between items-center">
        <span className="font-mono text-[11px] text-paper/40">
          {gate.verifiedCount} verification{gate.verifiedCount === 1 ? "" : "s"} recorded
        </span>
        <span className="font-mono text-[11px] text-paper/40">
          {gate.gateOpen ? "open" : "closed"}
        </span>
      </div>
    </div>
  );
}
