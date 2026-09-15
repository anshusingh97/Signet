import { WalletStatus } from "../hooks/useLaceWallet";
import { explorerContractUrl } from "../lib/onchain";

function truncate(addr: string) {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function Header({
  status,
  address,
  walletName,
  error,
  onConnect,
  onDisconnect,
}: {
  status: WalletStatus;
  address: string | null;
  walletName?: string | null;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <header className="border-b border-paper/10">
      <div className="mx-auto max-w-3xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="30" height="30" viewBox="0 0 64 64" className="shrink-0">
            <rect x="6" y="6" width="52" height="52" rx="10" className="fill-graphite-light" />
            <rect x="6" y="6" width="52" height="52" rx="10" fill="none" stroke="#C9A227" strokeWidth="1.5" />
            <circle cx="32" cy="32" r="14" fill="none" stroke="#4FA88F" strokeWidth="2.5" />
            <circle cx="32" cy="32" r="4" fill="#C9A227" />
          </svg>
          <div>
            <p className="font-display text-xl text-paper leading-none">Signet</p>
            <p className="font-mono text-[11px] text-paper/50 mt-1">
              first quarter · midnight builder challenge
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {status === "connected" && address ? (
            <>
              <div className="flex items-center gap-2">
                {/* Wallet badge */}
                {walletName && (
                  <span className="font-mono text-[10px] bg-paper/10 text-paper/70 px-1.5 py-0.5 rounded border border-paper/15">
                    {walletName}
                  </span>
                )}
                {/* Green dot indicator */}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-verdigris-light animate-pulse" />
                <span className="font-mono text-xs text-verdigris-light">
                  {truncate(address)}
                </span>
                <button
                  onClick={onDisconnect}
                  className="font-mono text-[10px] text-paper/40 border border-paper/15 rounded px-2 py-1 hover:border-paper/30 hover:text-paper/60 transition-colors"
                  title="Disconnect wallet"
                >
                  disconnect
                </button>
              </div>
              <a
                href={explorerContractUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-paper/35 hover:text-verdigris-light transition-colors"
              >
                ↗ view contract on-chain
              </a>
            </>
          ) : (
            <button
              onClick={onConnect}
              disabled={status === "connecting"}
              id="connect-wallet-btn"
              className="font-mono text-xs text-paper border border-paper/25 rounded px-3 py-1.5 hover:border-brass hover:text-brass-light transition-colors disabled:opacity-50"
            >
              {status === "connecting" ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-paper/30 border-t-paper animate-spin" />
                  connecting…
                </span>
              ) : (
                "connect wallet"
              )}
            </button>
          )}
          {(status === "unavailable" || status === "error") && error && (
            <p className="text-[11px] text-brass-light max-w-[260px] text-right mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
