import { useCallback, useEffect, useState } from "react";

export type WalletId = "1am" | "lace" | string;

export interface DiscoveredWallet {
  id: WalletId;
  name: string;
  icon?: string;
  installed: boolean;
  provider?: any;
}

export type WalletStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "unavailable"
  | "error";

export interface WalletApi {
  coinPublicKey: string;
  address?: string;
  walletId: string;
  walletName: string;
  provider: any;
}

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  coinPublicKey: string | null;
  connectedWalletId: WalletId | null;
  connectedWalletName: string | null;
  error: string | null;
  api: WalletApi | null;
  availableWallets: DiscoveredWallet[];
  connect: (walletId?: WalletId) => Promise<void>;
  disconnect: () => void;
  refreshAvailableWallets: () => DiscoveredWallet[];
}

const STORAGE_KEY = "signet_wallet_connected";
const STORAGE_WALLET_ID = "signet_wallet_id";

// Helper to inspect window.midnight and discover installed wallets
export function discoverMidnightWallets(): DiscoveredWallet[] {
  if (typeof window === "undefined") return [];

  const midnight = (window as any).midnight;
  const discovered: DiscoveredWallet[] = [];

  // Check for 1AM Wallet
  // 1AM can inject as window.midnight['1am'] or window.midnight.oneam or custom key
  let oneAmProvider = midnight?.["1am"] || midnight?.oneam || midnight?.["1AM"];
  if (!oneAmProvider && midnight) {
    for (const key of Object.keys(midnight)) {
      const entry = midnight[key];
      if (
        key.toLowerCase().includes("1am") ||
        (entry?.name && entry.name.toLowerCase().includes("1am"))
      ) {
        oneAmProvider = entry;
        break;
      }
    }
  }

  discovered.push({
    id: "1am",
    name: oneAmProvider?.name || "1AM Wallet",
    icon: oneAmProvider?.icon,
    installed: !!oneAmProvider,
    provider: oneAmProvider,
  });

  // Check for Lace Wallet
  let laceProvider = midnight?.mnLace;
  if (!laceProvider && midnight) {
    for (const key of Object.keys(midnight)) {
      const entry = midnight[key];
      if (
        key.toLowerCase().includes("lace") ||
        (entry?.name && entry.name.toLowerCase().includes("lace"))
      ) {
        laceProvider = entry;
        break;
      }
    }
  }

  discovered.push({
    id: "lace",
    name: laceProvider?.name || "Lace Wallet",
    icon: laceProvider?.icon,
    installed: !!laceProvider,
    provider: laceProvider,
  });

  // Also include any other wallets present in window.midnight
  if (midnight) {
    for (const key of Object.keys(midnight)) {
      if (
        key !== "1am" &&
        key !== "oneam" &&
        key !== "1AM" &&
        key !== "mnLace" &&
        !discovered.some((d) => d.provider === midnight[key])
      ) {
        const item = midnight[key];
        if (typeof item === "object" && item !== null) {
          discovered.push({
            id: key,
            name: item.name || `Midnight Wallet (${key})`,
            icon: item.icon,
            installed: true,
            provider: item,
          });
        }
      }
    }
  }

  return discovered;
}

export function useLaceWallet(): WalletState {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [coinPublicKey, setCoinPublicKey] = useState<string | null>(null);
  const [connectedWalletId, setConnectedWalletId] = useState<WalletId | null>(null);
  const [connectedWalletName, setConnectedWalletName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<WalletApi | null>(null);
  const [availableWallets, setAvailableWallets] = useState<DiscoveredWallet[]>(() =>
    discoverMidnightWallets()
  );

  const refreshAvailableWallets = useCallback(() => {
    const list = discoverMidnightWallets();
    setAvailableWallets(list);
    return list;
  }, []);

  // Update discovered wallets when extension loads
  useEffect(() => {
    refreshAvailableWallets();
    const timer = setTimeout(refreshAvailableWallets, 1000);
    return () => clearTimeout(timer);
  }, [refreshAvailableWallets]);

  // Connect helper given a wallet provider
  const doConnectWithProvider = useCallback(
    async (provider: any, walletId: WalletId, walletName: string) => {
      setStatus("connecting");
      setError(null);

      try {
        let connResult: any = null;

        // Support both connect('preprod') and enable()
        if (typeof provider.connect === "function") {
          try {
            connResult = await provider.connect("preprod");
          } catch {
            connResult = await provider.connect();
          }
        } else if (typeof provider.enable === "function") {
          connResult = await provider.enable();
        } else {
          throw new Error(`Wallet ${walletName} does not provide enable() or connect().`);
        }

        // Extract coinPublicKey and address from connection result
        const cpk =
          connResult?.coinPublicKey ||
          connResult?.address ||
          connResult?.state?.address ||
          (typeof connResult?.getPublicKeys === "function" ? (await connResult.getPublicKeys())?.coinPublicKey : null) ||
          "midnight-wallet-user";

        const addr = connResult?.address || cpk;

        const walletApiObj: WalletApi = {
          coinPublicKey: cpk,
          address: addr,
          walletId,
          walletName,
          provider: connResult || provider,
        };

        setCoinPublicKey(cpk);
        setAddress(addr);
        setConnectedWalletId(walletId);
        setConnectedWalletName(walletName);
        setApi(walletApiObj);
        setStatus("connected");

        localStorage.setItem(STORAGE_KEY, "true");
        localStorage.setItem(STORAGE_WALLET_ID, walletId);
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Wallet connection was declined.");
      }
    },
    []
  );

  // Auto-reconnect on page load if user previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem(STORAGE_KEY) === "true";
    const savedWalletId = localStorage.getItem(STORAGE_WALLET_ID);
    if (!wasConnected) return;

    const tryReconnect = async () => {
      const wallets = discoverMidnightWallets();
      const target =
        wallets.find((w) => w.id === savedWalletId && w.installed) ||
        wallets.find((w) => w.installed);

      if (!target || !target.provider) return;

      const provider = target.provider;
      try {
        const isConn = provider.isConnected
          ? await provider.isConnected()
          : provider.isEnabled
          ? await provider.isEnabled()
          : false;

        if (isConn) {
          await doConnectWithProvider(provider, target.id, target.name);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    const timer = setTimeout(tryReconnect, 1000);
    return () => clearTimeout(timer);
  }, [doConnectWithProvider]);

  const connect = useCallback(
    async (preferredWalletId?: WalletId) => {
      setError(null);
      const wallets = discoverMidnightWallets();
      setAvailableWallets(wallets);

      let chosen: DiscoveredWallet | undefined;

      if (preferredWalletId) {
        chosen = wallets.find((w) => w.id === preferredWalletId);
      } else {
        // Default to installed wallet (prefer 1am if installed, else lace, else first installed)
        chosen =
          wallets.find((w) => w.id === "1am" && w.installed) ||
          wallets.find((w) => w.id === "lace" && w.installed) ||
          wallets.find((w) => w.installed);
      }

      if (!chosen || !chosen.installed || !chosen.provider) {
        setStatus("unavailable");
        const walletLabel =
          preferredWalletId === "1am"
            ? "1AM Wallet"
            : preferredWalletId === "lace"
            ? "Lace Wallet"
            : "Midnight wallet (1AM or Lace)";
        setError(`${walletLabel} extension not detected. Please install it in your browser.`);
        return;
      }

      await doConnectWithProvider(chosen.provider, chosen.id, chosen.name);
    },
    [doConnectWithProvider]
  );

  const disconnect = useCallback(() => {
    setAddress(null);
    setCoinPublicKey(null);
    setConnectedWalletId(null);
    setConnectedWalletName(null);
    setApi(null);
    setStatus("idle");
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_WALLET_ID);
  }, []);

  return {
    status,
    address,
    coinPublicKey,
    connectedWalletId,
    connectedWalletName,
    error,
    api,
    availableWallets,
    connect,
    disconnect,
    refreshAvailableWallets,
  };
}

// Export alias for semantic clarity
export const useMidnightWallet = useLaceWallet;
