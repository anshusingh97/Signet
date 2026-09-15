import { useState } from "react";
import { DiscoveredWallet, WalletId } from "../hooks/useLaceWallet";

export function WalletConnectModal({
  wallets,
  onSelectWallet,
  onCancel,
}: {
  wallets: DiscoveredWallet[];
  onSelectWallet: (walletId: WalletId) => void;
  onCancel: () => void;
}) {
  const has1am = wallets.find((w) => w.id === "1am" && w.installed);
  const hasLace = wallets.find((w) => w.id === "lace" && w.installed);
  const [selectedWalletId, setSelectedWalletId] = useState<WalletId>(
    has1am ? "1am" : hasLace ? "lace" : "1am"
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="bg-graphite-light border border-paper/15 rounded-md w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-paper/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-graphite flex items-center justify-center shrink-0 border border-paper/10">
                <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
                  <rect x="6" y="6" width="52" height="52" rx="10" fill="#1B1D22" />
                  <rect x="6" y="6" width="52" height="52" rx="10" stroke="#C9A227" strokeWidth="2" />
                  <circle cx="32" cy="32" r="14" stroke="#4FA88F" strokeWidth="3" />
                  <circle cx="32" cy="32" r="4" fill="#C9A227" />
                </svg>
              </div>
              <div>
                <p id="wallet-modal-title" className="font-display text-base text-paper">
                  Connect Midnight Wallet
                </p>
                <p className="font-mono text-[10px] text-paper/40 mt-0.5">
                  Midnight Preprod · Zero-Knowledge Proofs
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-paper/40 hover:text-paper/80 font-mono text-sm px-2 py-1 rounded"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-xs text-paper/70">
              Select your Midnight wallet to sign transactions and submit zero-knowledge proofs on-chain:
            </p>

            {/* Wallet Selection List */}
            <div className="space-y-2.5">
              {/* 1AM Wallet Option */}
              <button
                type="button"
                onClick={() => setSelectedWalletId("1am")}
                className={`w-full flex items-center justify-between p-3.5 rounded border transition-all text-left ${
                  selectedWalletId === "1am"
                    ? "border-verdigris bg-verdigris/10 ring-1 ring-verdigris"
                    : "border-paper/10 bg-graphite/40 hover:border-paper/25 hover:bg-graphite/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <span className="font-display font-bold text-xs text-indigo-300">
                      1AM
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-paper">
                        1AM Wallet
                      </span>
                      {has1am ? (
                        <span className="font-mono text-[9px] bg-verdigris/20 text-verdigris-light px-1.5 py-0.5 rounded border border-verdigris/30">
                          Detected
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] bg-paper/10 text-paper/40 px-1.5 py-0.5 rounded">
                          Extension
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-paper/50 mt-0.5">
                      Delegated proof provider & dust sponsorship
                    </p>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedWalletId === "1am"
                      ? "border-verdigris bg-verdigris"
                      : "border-paper/30"
                  }`}
                >
                  {selectedWalletId === "1am" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-graphite" />
                  )}
                </div>
              </button>

              {/* Lace Wallet Option */}
              <button
                type="button"
                onClick={() => setSelectedWalletId("lace")}
                className={`w-full flex items-center justify-between p-3.5 rounded border transition-all text-left ${
                  selectedWalletId === "lace"
                    ? "border-verdigris bg-verdigris/10 ring-1 ring-verdigris"
                    : "border-paper/10 bg-graphite/40 hover:border-paper/25 hover:bg-graphite/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-amber-950/60 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" stroke="#F59E0B" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="3" fill="#F59E0B" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-paper">
                        Lace Wallet
                      </span>
                      {hasLace ? (
                        <span className="font-mono text-[9px] bg-verdigris/20 text-verdigris-light px-1.5 py-0.5 rounded border border-verdigris/30">
                          Detected
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] bg-paper/10 text-paper/40 px-1.5 py-0.5 rounded">
                          Extension
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-paper/50 mt-0.5">
                      Midnight Lace connector (Preprod)
                    </p>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedWalletId === "lace"
                      ? "border-verdigris bg-verdigris"
                      : "border-paper/30"
                  }`}
                >
                  {selectedWalletId === "lace" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-graphite" />
                  )}
                </div>
              </button>
            </div>

            {/* Info Checklist */}
            <div className="bg-graphite/60 border border-paper/10 rounded p-3 space-y-2">
              {[
                "Wallet prompt appears to authorize each on-chain transaction",
                "Every proof is recorded on Midnight Preprod blockchain",
                "Transaction hash links directly to Midnight Explorer",
                "Zero-knowledge privacy: credential secrets stay in your browser",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mt-0.5 shrink-0"
                  >
                    <path
                      d="M4 12l5 5L20 6"
                      stroke="#4FA88F"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[11px] text-paper/65 leading-tight">{item}</span>
                </div>
              ))}
            </div>

            {/* Network Badge */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-mono text-[10px] text-paper/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-verdigris-light inline-block" />
                Midnight Preprod
              </span>
              <span className="font-mono text-[10px] text-paper/40">
                Persistent auto-reconnect enabled
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 pt-1 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 font-mono text-xs text-paper/50 border border-paper/15 rounded py-2.5 hover:border-paper/30 hover:text-paper/70 transition-colors"
            >
              cancel
            </button>
            <button
              type="button"
              onClick={() => onSelectWallet(selectedWalletId)}
              id="wallet-modal-confirm-btn"
              className="flex-1 font-mono text-xs bg-verdigris text-graphite-deep rounded py-2.5 hover:bg-verdigris-light transition-colors font-medium shadow-sm"
            >
              connect {selectedWalletId === "1am" ? "1AM" : "Lace"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
