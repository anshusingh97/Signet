import { useCallback, useState } from "react";

// Midnight's Lace wallet injects itself at window.midnight.mnLace.
// See: https://docs.midnight.network — "Connect a wallet"
declare global {
  interface Window {
    midnight?: {
      mnLace?: {
        enable: () => Promise<{ address: string }>;
        isEnabled: () => Promise<boolean>;
      };
    };
  }
}

export type WalletStatus = "disconnected" | "connecting" | "connected" | "unavailable" | "error";

export function useLaceWallet() {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    const lace = window.midnight?.mnLace;
    if (!lace) {
      setStatus("unavailable");
      setError("Lace wallet extension was not detected in this browser.");
      return;
    }
    try {
      setStatus("connecting");
      const { address } = await lace.enable();
      setAddress(address);
      setStatus("connected");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Wallet connection was declined.");
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setStatus("disconnected");
  }, []);

  return { status, address, error, connect, disconnect };
}
