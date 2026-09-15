import { useState } from "react";
import { GateState, issueCredential, presentCredential } from "../lib/credentialSimulator";
import { callPresentCredentialOnChain, explorerTxUrl, explorerContractUrl, OnChainResult } from "../lib/onchain";

type Phase = "unissued" | "ready" | "proving" | "awaiting_signature" | "done" | "error";

const TIERS = [1, 2, 3, 4, 5];

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function CredentialCard({
  gate,
  onVerified,
  walletApi,
  walletStatus,
}: {
  gate: GateState;
  onVerified: () => void;
  walletApi: { coinPublicKey: string; provider?: unknown; walletName?: string } | null;
  walletStatus: string;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [tier, setTier] = useState<number>(3);
  const [issuedTier, setIssuedTier] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("unissued");
  const [txResult, setTxResult] = useState<OnChainResult | null>(null);
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
    setErrorMsg(null);

    if (walletApi) {
      // ── REAL ON-CHAIN PATH ────────────────────────────────────────────
      setPhase("awaiting_signature");
      const result = await callPresentCredentialOnChain(secret, issuedTier, walletApi);
      if (result.ok) {
        // Also update local sim state so counts stay consistent
        await presentCredential(gate, secret, issuedTier);
        setTxResult(result);
        setPhase("done");
        onVerified();
      } else {
        // Fall back to simulator if SDK not available (no bboard-contract pkg)
        if (
          result.error.includes("Cannot find module") ||
          result.error.includes("Failed to fetch") ||
          result.error.includes("dynamic import")
        ) {
          await runSimulatorFallback();
        } else {
          setErrorMsg(result.error);
          setPhase("error");
        }
      }
    } else {
      // ── SIMULATOR PATH (no wallet connected) ─────────────────────────
      await runSimulatorFallback();
    }
  }

  async function runSimulatorFallback() {
    if (!secret || issuedTier === null) return;
    setPhase("proving");
    await new Promise((r) => setTimeout(r, 900));
    const result = await presentCredential(gate, secret, issuedTier);
    if (result.ok) {
      setTxResult({ ok: false, error: "" }); // No real tx in sim
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

  const walletConnected = walletStatus === "connected" && !!walletApi;

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

        {/* Wallet connection banner */}
        {!walletConnected && phase === "unissued" && (
          <div className="mb-5 px-3 py-2 bg-brass/8 border border-brass/25 rounded-sm flex items-center gap-2">
            <span className="text-brass-light text-lg">⚠</span>
            <p className="text-xs text-brass-light/80 leading-relaxed">
              Connect your Lace wallet to submit real on-chain proofs. Without a wallet, 
              the simulator mirrors the circuit logic locally.
            </p>
          </div>
        )}

        {phase === "unissued" && (
          <div className="space-y-4">
            <p className="text-sm text-paper/70 leading-relaxed">
              Choose the tier your credential was issued at. This value stays on
              your device — never disclosed, even when it clears the gate.
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

        {/* Success state */}
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

            {/* On-chain transaction link */}
            {txResult?.ok && (
              <div className="border border-verdigris/30 rounded-sm p-4 bg-verdigris/5 space-y-2">
                <p className="text-[11px] text-paper/45 uppercase tracking-wider">
                  On-chain Transaction
                </p>
                <p className="font-mono text-xs text-verdigris-light break-all">
                  {txResult.txId}
                </p>
                <a
                  href={explorerTxUrl(txResult.txId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="tx-explorer-link"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-verdigris-light border border-verdigris/40 rounded px-2.5 py-1 hover:bg-verdigris/10 transition-colors"
                >
                  ↗ verify on Midnight Explorer
                </a>
                <p className="text-[10px] text-paper/30 mt-1">
                  This transaction is publicly verifiable on Midnight Preprod.
                </p>
              </div>
            )}

            {/* Simulator receipt (no wallet) */}
            {(!txResult || !txResult.ok) && (
              <div className="border border-paper/12 rounded-sm p-4 bg-graphite/40 space-y-1">
                <p className="text-[11px] text-paper/45">your private receipt</p>
                <p className="font-mono text-xs text-paper/50 break-all">
                  {txResult?.error === "" ? "(simulator mode — connect wallet for on-chain proof)" : "verified locally"}
                </p>
                <a
                  href={explorerContractUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-paper/40 hover:text-verdigris-light transition-colors"
                >
                  ↗ view gate contract on Midnight Explorer
                </a>
              </div>
            )}
          </div>
        )}

        {/* Ready / Proving / Error states */}
        {(phase === "ready" || phase === "proving" || phase === "awaiting_signature" || phase === "error") && (
          <div className="space-y-4">
            <div className="border border-paper/12 rounded-sm px-4 py-3 flex items-center justify-between bg-graphite/40">
              <span className="text-sm text-paper/70">Holding a credential</span>
              <span className="font-mono text-xs text-paper/40">tier withheld</span>
            </div>

            {phase === "awaiting_signature" && (
              <div className="border border-verdigris/30 bg-verdigris/5 rounded-sm px-4 py-3 flex items-center gap-3">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-verdigris/30 border-t-verdigris-light animate-spin shrink-0" />
                <div>
                  <p className="text-sm text-verdigris-light font-medium">
                    Waiting for wallet signature…
                  </p>
                  <p className="text-xs text-paper/50 mt-0.5">
                    Check your Lace wallet popup to approve the transaction.
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-sm text-brass-light border border-brass/30 bg-brass/5 rounded-sm px-3 py-2">
                {errorMsg}
              </p>
            )}

            <button
              onClick={handlePresent}
              disabled={phase === "proving" || phase === "awaiting_signature"}
              id="present-credential-btn"
              className="w-full font-mono text-sm bg-verdigris text-graphite-deep rounded-sm py-3.5 hover:bg-verdigris-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {phase === "proving" ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-graphite-deep/30 border-t-graphite-deep animate-spin" />
                  generating proof…
                </>
              ) : phase === "awaiting_signature" ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-graphite-deep/30 border-t-graphite-deep animate-spin" />
                  awaiting wallet signature…
                </>
              ) : walletConnected ? (
                "prove & submit on-chain ↗"
              ) : (
                "prove & present credential"
              )}
            </button>

            {walletConnected && phase === "ready" && (
              <p className="text-[11px] text-paper/35 text-center">
                Your Lace wallet will open for signature approval.
              </p>
            )}
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
