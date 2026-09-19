import "../polyfills";

// Midnight Preprod deployed contract address
export const CONTRACT_ADDRESS =
  "d6258de4cb23f7ff1903f4903d0a8d682f108cd9da99a7e592739296ba80dc8c";


export const EXPLORER_BASE = "https://preprod.midnightexplorer.com";

export function explorerTxUrl(txId: string) {
  return `${EXPLORER_BASE}/transactions/0x${txId}`;
}

export function explorerContractUrl() {
  return `${EXPLORER_BASE}/contracts/0x${CONTRACT_ADDRESS}`;
}

// -----------------------------------------------------------------------
// On-chain interaction via Midnight.js contract bindings
// -----------------------------------------------------------------------
// The Midnight SDK is loaded lazily only when a wallet is connected and
// the user actually calls presentCredential. This avoids bundling the
// large WASM modules for users who never connect.
//
// API surface used (Midnight.js 0.x public preview):
//   - @midnight-ntwrk/midnight-js-contracts  → deployedContract, callTx
//   - @midnight-ntwrk/bboard-contract        → CompiledBBoardContractContract
//   - Wallet provider comes from the connected Lace extension
// -----------------------------------------------------------------------

export type OnChainResult =
  | { ok: true; txId: string; nullifier: string }
  | { ok: false; error: string };

interface WitnessContext<PS> {
  privateState: PS;
}

interface TxDataResponse {
  txId?: string;
  hash?: string;
  id?: string;
}

/**
 * Call the on-chain presentCredential circuit.
 * @param secret  Private credential secret (32-byte hex string, stays local)
 * @param tier    Credential tier chosen by the holder
 * @param walletApi  The Lace enable() result (has coinPublicKey for provider)
 */
export async function callPresentCredentialOnChain(
  secret: string,
  tier: number,
  walletApi: { coinPublicKey: string; provider?: unknown }
): Promise<OnChainResult> {
  try {
    // Dynamically import heavy Midnight SDK — now bundled by Vite
    const [
      { indexerPublicDataProvider },
      { httpClientProofProvider },
      { levelPrivateStateProvider },
      { FetchZkConfigProvider },
      { findDeployedContract },
      { CompiledContract },
      { CompiledBBoardContractContract: BboardContract },
      { setNetworkId },
      { Transaction },
      { toHex, fromHex },
      { createProofProvider },
    ] = await Promise.all([
      import("@midnight-ntwrk/midnight-js-indexer-public-data-provider"),
      import("@midnight-ntwrk/midnight-js-http-client-proof-provider"),
      import("@midnight-ntwrk/midnight-js-level-private-state-provider"),
      import("@midnight-ntwrk/midnight-js-fetch-zk-config-provider"),
      import("@midnight-ntwrk/midnight-js-contracts"),
      import("@midnight-ntwrk/midnight-js-protocol/compact-js"),
      import("@midnight-ntwrk/bboard-contract"),
      import("@midnight-ntwrk/midnight-js-network-id"),
      import("@midnight-ntwrk/midnight-js-protocol/ledger"),
      import("@midnight-ntwrk/midnight-js-utils"),
      import("@midnight-ntwrk/midnight-js-types"),
    ]);


    setNetworkId("preprod");

    // Preprod network endpoints
    const indexerHttp =
      "https://indexer.preprod.midnight.network/api/v4/graphql";
    const indexerWs =
      "wss://indexer.preprod.midnight.network/api/v4/graphql/ws";
    const proofServer = "https://proof-server.preprod.midnight.network";
    const zkConfigPath = `${window.location.origin}/managed/bboard`;

    // Build private state for this credential holder
    const secretBytes = hexToBytes(secret.padStart(64, "0").slice(0, 64));

    // Witnesses: supply private values to the ZK circuit
    // Compact witnesses receive WitnessContext<Ledger, PS> and return [PS, Value]
    const witnesses = {
      credentialSecret: <PS>(context: WitnessContext<PS>): [PS, Uint8Array] => [
        context.privateState,
        secretBytes,
      ],
      credentialTier: <PS>(context: WitnessContext<PS>): [PS, bigint] => [
        context.privateState,
        BigInt(tier),
      ],
      credentialPath: <PS>(context: WitnessContext<PS>) => [
        context.privateState,
        {
          leaf: secretBytes,
          path: Array.from({ length: 10 }, () => ({
            sibling: { field: 0n },
            goes_left: false,
          })),
        },
      ],
    };

    const zkConfigProvider = new FetchZkConfigProvider(zkConfigPath, fetch.bind(window));

    interface InjectedMidnight {
      midnight?: Record<string, { getProvingProvider?: () => unknown }>;
    }
    const win = window as unknown as InjectedMidnight;

    // Use the active wallet provider (1AM Wallet, Lace, or injected)
    const activeProvider =
      walletApi.provider ||
      win.midnight?.["1am"] ||
      win.midnight?.oneam ||
      win.midnight?.mnLace;

    const provingFn =
      typeof activeProvider === "object" &&
      activeProvider !== null &&
      "getProvingProvider" in activeProvider &&
      typeof (activeProvider as { getProvingProvider?: unknown }).getProvingProvider === "function"
        ? (activeProvider as { getProvingProvider: () => unknown }).getProvingProvider()
        : null;

    let proofProvider: any;
    if (provingFn && typeof (provingFn as any).proveTx === "function") {
      proofProvider = provingFn;
    } else if (provingFn && typeof (provingFn as any).prove === "function") {
      proofProvider = createProofProvider(provingFn as any);
    } else {
      proofProvider = httpClientProofProvider(proofServer, zkConfigProvider);
    }

    const privateStateProvider = levelPrivateStateProvider({
      privateStateStoreName: `signet-private-state-${walletApi.coinPublicKey.slice(0, 8)}`,
      signingKeyStoreName: `signet-signing-${walletApi.coinPublicKey.slice(0, 8)}`,
      privateStoragePasswordProvider: () => "TempPassword123!Secure",
      accountId: walletApi.coinPublicKey,
    });

    let shieldedCoinPk = walletApi.coinPublicKey;
    let shieldedEncPk = walletApi.coinPublicKey;
    const ap = activeProvider as Record<string, unknown> | undefined;
    if (typeof ap?.getShieldedAddresses === "function") {
      try {
        const addresses = await (ap.getShieldedAddresses as () => Promise<{
          shieldedCoinPublicKey?: string;
          shieldedEncryptionPublicKey?: string;
        }>)();
        if (addresses?.shieldedCoinPublicKey) {
          shieldedCoinPk = addresses.shieldedCoinPublicKey;
        }
        if (addresses?.shieldedEncryptionPublicKey) {
          shieldedEncPk = addresses.shieldedEncryptionPublicKey;
        }
      } catch (err) {
        console.warn("Could not retrieve shielded addresses:", err);
      }
    }

    const walletProvider = {
      getCoinPublicKey(): string {
        return shieldedCoinPk;
      },
      getEncryptionPublicKey(): string {
        return shieldedEncPk;
      },
      balanceTx: async (tx: { serialize: () => Uint8Array }, ttl?: Date) => {
        if (typeof ap?.balanceUnsealedTransaction === "function") {
          const serializedTx = toHex(tx.serialize());
          const received = await (ap.balanceUnsealedTransaction as (s: string) => Promise<{ tx: string }>)(serializedTx);
          return Transaction.deserialize(
            "signature",
            "proof",
            "binding",
            fromHex(received.tx)
          );
        }
        if (typeof ap?.balanceTx === "function") {
          return (ap.balanceTx as (t: unknown, ttl?: Date) => Promise<unknown>)(tx, ttl);
        }
        if (typeof ap?.balanceTransaction === "function") {
          return (ap.balanceTransaction as (t: unknown, ttl?: Date) => Promise<unknown>)(tx, ttl);
        }
        throw new Error(
          "Connected wallet does not support balancing transactions. Please ensure your wallet is on Preprod."
        );
      },
    };

    const midnightProvider = {
      submitTx: async (tx: { serialize: () => Uint8Array; identifiers: () => string[] }) => {
        if (typeof ap?.submitTransaction === "function") {
          await (ap.submitTransaction as (s: string) => Promise<unknown>)(toHex(tx.serialize()));
          const txIdentifiers = tx.identifiers();
          return txIdentifiers[0];
        }
        if (typeof ap?.submitTx === "function") {
          return (ap.submitTx as (t: unknown) => Promise<string>)(tx);
        }
        throw new Error("Connected wallet does not support submitting transactions.");
      },
    };

    const providers: Record<string, unknown> = {
      privateStateProvider,
      publicDataProvider: indexerPublicDataProvider(indexerHttp, indexerWs),
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    };

    // Attach witnesses directly to the compiled contract using CompiledContract.withWitnesses
    type CompiledContractTarget = Parameters<typeof findDeployedContract>[1]["compiledContract"];
    const withWitnessesFn = CompiledContract.withWitnesses as unknown as (
      w: typeof witnesses
    ) => (contract: unknown) => CompiledContractTarget;
    const compiledContract = withWitnessesFn(witnesses)(BboardContract);

    // Connect to the already-deployed contract
    const contract = await findDeployedContract(providers, {
      contractAddress: CONTRACT_ADDRESS,
      compiledContract,
      privateStateId: walletApi.coinPublicKey,
      initialPrivateState: { secretKey: secretBytes },
    });

    // Call the presentCredential circuit — Lace pops up for signature
    const tx = await contract.callTx.presentCredential();
    const txRecord = tx as unknown as TxDataResponse;
    const txId: string = String(
      txRecord.txId ?? txRecord.hash ?? txRecord.id ?? JSON.stringify(tx).slice(0, 64)
    );

    // Nullifier = hash of secret (mirrors circuit)
    const nullifier = await sha256hex(secret);

    return { ok: true, txId, nullifier };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function sha256hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
