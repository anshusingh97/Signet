import { WalletStatus } from "../hooks/useLaceWallet";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Header({
  status,
  address,
  error,
  onConnect,
  onDisconnect,
}: {
  status: WalletStatus;
  address: string | null;
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
            <button
              onClick={onDisconnect}
              className="font-mono text-xs text-verdigris-light border border-verdigris/40 rounded px-3 py-1.5 hover:bg-verdigris/10 transition-colors"
            >
              {truncate(address)} · disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={status === "connecting"}
              className="font-mono text-xs text-paper border border-paper/25 rounded px-3 py-1.5 hover:border-brass hover:text-brass-light transition-colors disabled:opacity-50"
            >
              {status === "connecting" ? "connecting…" : "connect lace wallet"}
            </button>
          )}
          {status === "unavailable" && (
            <p className="text-[11px] text-paper/40 max-w-[220px] text-right">{error}</p>
          )}
          {status === "error" && error && (
            <p className="text-[11px] text-brass-light max-w-[220px] text-right">{error}</p>
          )}
        </div>
      </div>
    </header>
  );
}
