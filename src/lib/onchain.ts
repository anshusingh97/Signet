// Midnight Preprod deployed contract address
export const CONTRACT_ADDRESS =
  "d1c1d7dfbe122a6ea84d005aff15855da00269f05f1c69a4a8e63b35cdd8ba8e";

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
      { Contract: BboardContract },
    ] = await Promise.all([
      import("@midnight-ntwrk/midnight-js-indexer-public-data-provider"),
      import("@midnight-ntwrk/midnight-js-http-client-proof-provider"),
      import("@midnight-ntwrk/midnight-js-level-private-state-provider"),
      import("@midnight-ntwrk/midnight-js-fetch-zk-config-provider"),
      import("@midnight-ntwrk/midnight-js-contracts"),
      import("./managed-contract"),
    ]);

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
    const witnesses = {
      credentialSecret: () => secretBytes,
      credentialTier: () => tier,
      // MerkleTreePath — for demo we generate a dummy path; replace with
      // real Merkle proof from the issuer's off-chain tree in production.
      credentialPath: () => ({
        leaf: secretBytes, // simplified: real path from issuer
        path: Array.from({ length: 10 }, () => ({ sibling: { field: BigInt(0) }, goes_left: false })),
      }),
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

    const proofProvider = provingFn || httpClientProofProvider(proofServer, zkConfigProvider);

    const providers: Record<string, unknown> = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: `signet-private-state-${walletApi.coinPublicKey.slice(0, 8)}`,
        signingKeyStoreName: `signet-signing-${walletApi.coinPublicKey.slice(0, 8)}`,
        privateStoragePasswordProvider: () => "TempPassword123!Secure",
        accountId: walletApi.coinPublicKey,
      }),
      publicDataProvider: indexerPublicDataProvider(indexerHttp, indexerWs),
      zkConfigProvider,
      proofProvider,
      walletProvider: activeProvider,
      midnightProvider: activeProvider,
    };

    // Connect to the already-deployed contract
    const contract = await findDeployedContract(providers, {
      contractAddress: CONTRACT_ADDRESS,
      compiledContract: BboardContract,
      privateStateId: walletApi.coinPublicKey,
      initialPrivateState: { witnesses },
    });

    // Call the presentCredential circuit — Lace pops up for signature
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (contract as any).callTx.presentCredential();
    const txId: string = tx.txId ?? tx.hash ?? tx.id ?? JSON.stringify(tx).slice(0, 64);

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
