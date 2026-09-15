export function WalletConnectModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-graphite-light border border-paper/15 rounded-sm w-full max-w-sm shadow-2xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-paper/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-graphite flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
                <rect x="6" y="6" width="52" height="52" rx="10" fill="#1B1D22" />
                <rect x="6" y="6" width="52" height="52" rx="10" stroke="#C9A227" strokeWidth="2" />
                <circle cx="32" cy="32" r="14" stroke="#4FA88F" strokeWidth="3" />
                <circle cx="32" cy="32" r="4" fill="#C9A227" />
              </svg>
            </div>
            <div>
              <p id="wallet-modal-title" className="font-display text-base text-paper">
                Connect Lace Wallet
              </p>
              <p className="font-mono text-[10px] text-paper/40 mt-0.5">
                Midnight Preprod · real on-chain proofs
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-paper/70 leading-relaxed">
              Signet will request access to your{" "}
              <strong className="text-paper font-medium">Lace wallet</strong>. Once
              connected:
            </p>
            <ul className="space-y-2">
              {[
                "Your wallet popup will appear to approve each transaction",
                "Every proof is submitted on-chain to Midnight Preprod",
                "Each transaction gets a verifiable Explorer link",
                "Your credential secret never leaves your browser",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg
                    width="14"
                    height="14"
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
                  <span className="text-xs text-paper/65 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            {/* Network badge */}
            <div className="flex items-center gap-2 bg-graphite/60 border border-paper/10 rounded-sm px-3 py-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-verdigris-light" />
              <span className="font-mono text-[10px] text-paper/50">
                Network: Midnight Preprod
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 font-mono text-sm text-paper/50 border border-paper/15 rounded-sm py-2.5 hover:border-paper/30 hover:text-paper/70 transition-colors"
            >
              cancel
            </button>
            <button
              onClick={onConfirm}
              id="wallet-modal-confirm-btn"
              className="flex-1 font-mono text-sm bg-verdigris text-graphite-deep rounded-sm py-2.5 hover:bg-verdigris-light transition-colors font-medium"
            >
              connect wallet
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
