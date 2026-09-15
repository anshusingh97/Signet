import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    midnight?: {
      mnLace?: {
        enable: () => Promise<{ coinPublicKey: string; address?: string }>;
        isEnabled: () => Promise<boolean>;
        apiVersion: string;
        name: string;
        icon: string;
      };
    };
  }
}

export type WalletStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "unavailable"
  | "error";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  coinPublicKey: string | null;
  error: string | null;
  api: { coinPublicKey: string } | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const STORAGE_KEY = "signet_wallet_connected";

export function useLaceWallet(): WalletState {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [coinPublicKey, setCoinPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<{ coinPublicKey: string } | null>(null);

  // Auto-reconnect on page load if user previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem(STORAGE_KEY) === "true";
    if (!wasConnected) return;

    const tryReconnect = async () => {
      const lace = window.midnight?.mnLace;
      if (!lace) return;
      try {
        const enabled = await lace.isEnabled();
        if (!enabled) return;
        const result = await lace.enable();
        const cpk = result.coinPublicKey;
        const addr = result.address ?? cpk;
        setCoinPublicKey(cpk);
        setAddress(addr);
        setApi({ coinPublicKey: cpk });
        setStatus("connected");
      } catch {
        // Silently fail auto-reconnect; user can click connect manually
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    // Give extension 1s to inject itself
    const timer = setTimeout(tryReconnect, 1000);
    return () => clearTimeout(timer);
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const lace = window.midnight?.mnLace;
    if (!lace) {
      setStatus("unavailable");
      setError(
        "Lace wallet extension not detected. Install it from the Midnight docs."
      );
      return;
    }
    try {
      setStatus("connecting");
      const result = await lace.enable(); // triggers wallet popup
      const cpk = result.coinPublicKey;
      const addr = result.address ?? cpk;
      setCoinPublicKey(cpk);
      setAddress(addr);
      setApi({ coinPublicKey: cpk });
      setStatus("connected");
      localStorage.setItem(STORAGE_KEY, "true");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? e.message : "Wallet connection was declined."
      );
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setCoinPublicKey(null);
    setApi(null);
    setStatus("idle");
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { status, address, coinPublicKey, error, api, connect, disconnect };
}
