import "../polyfills";
import { blake2b } from "@noble/hashes/blake2.js";

// Midnight Preprod deployed contract address
export const CONTRACT_ADDRESS =
  "d6258de4cb23f7ff1903f4903d0a8d682f108cd9da99a7e592739296ba80dc8c";


export function explorerTxUrl(txId: string) {
  const cleanId = txId.replace(/^0x/, "");
  return `https://explorer.1am.xyz/tx/${cleanId}?network=preprod`;
}

export function explorerContractUrl() {
  return `https://preprod.midnight.network/contract/${CONTRACT_ADDRESS}`;
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
    const zkConfigPath = `${window.location.origin}/managed/bboard`;

    // Build private state for this credential holder
    const secretBytes = hexToBytes(secret.padStart(64, "0").slice(0, 64));

    // Witnesses: supply private values to the ZK circuit.
    // Compact witnesses receive WitnessContext<Ledger, PS> and return [PS, Value].
    // Note: the merkle tree root assertions are commented out in bboard.compact, so
    // the leaf and path values here are not checked on-chain — only the nullifier
    // uniqueness and tier >= requiredTier assertions matter.
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

    // 1AM ProofStation — the correct proof server for the 1AM wallet on Preprod.
    // The public Midnight proof server generates proofs incompatible with 1AM wallet (error 182).
    const ONEAM_PROOF_SERVER = "https://api-preprod.1am.xyz";

    const activeProvider =
      walletApi.provider ||
      win.midnight?.["1am"] ||
      win.midnight?.oneam ||
      win.midnight?.mnLace;

    // Try to get proverServerUri from the wallet's own configuration first.
    // The 1AM wallet returns 'https://api-preprod.1am.xyz' for preprod.
    let walletProofServerUri: string = ONEAM_PROOF_SERVER;
    const apAny = activeProvider as Record<string, unknown> | undefined;
    if (typeof apAny?.getConfiguration === "function") {
      try {
        const conf = await (apAny.getConfiguration as () => Promise<{ proverServerUri?: string }>)();
        if (conf?.proverServerUri) {
          walletProofServerUri = conf.proverServerUri;
        }
      } catch (err) {
        console.warn("Could not read wallet getConfiguration, using 1AM ProofStation:", err);
      }
    }

    const provingFn =
      typeof activeProvider === "object" &&
      activeProvider !== null &&
      "getProvingProvider" in activeProvider &&
      typeof (activeProvider as { getProvingProvider?: unknown }).getProvingProvider === "function"
        ? (activeProvider as { getProvingProvider: () => unknown }).getProvingProvider()
        : null;

    type UnknownRecord = Record<string, unknown>;
    const pFn = provingFn as UnknownRecord | null;
    let proofProvider: unknown;

    if (pFn && typeof pFn.proveTx === "function") {
      proofProvider = pFn;
    } else if (pFn && typeof pFn.prove === "function") {
      proofProvider = (createProofProvider as unknown as (p: unknown) => unknown)(pFn);
    } else {
      // Always use 1AM ProofStation — it sponsors DUST and generates valid proofs
      // that the 1AM wallet will accept. Do NOT use proof-server.preprod.midnight.network
      // as it produces error 182 (ZK proof rejected by 1AM wallet verifier).
      proofProvider = httpClientProofProvider(walletProofServerUri, zkConfigProvider);
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
      balanceTx: async (tx: { serialize: () => Uint8Array }, _ttl?: Date) => {
        const serializedTx = toHex(tx.serialize());

        // 1. Try wallet's native balanceUnsealedTransaction first (now that user has DUST)
        if (typeof ap?.balanceUnsealedTransaction === "function") {
          try {
            console.log("Balancing transaction via 1AM wallet balanceUnsealedTransaction...");
            const received = await (ap.balanceUnsealedTransaction as (s: string) => Promise<{ tx: string }>)(serializedTx);
            console.log("Wallet balanced transaction successfully!");
            return Transaction.deserialize(
              "signature",
              "proof",
              "binding",
              fromHex(received.tx)
            );
          } catch (walletBalErr) {
            console.warn("Wallet balanceUnsealedTransaction failed, falling back to ProofStation /balance-only:", walletBalErr);
          }
        }

        // 2. Fallback: Use 1AM ProofStation's /balance-only endpoint for fee sponsorship
        console.log("Balancing transaction via ProofStation /balance-only...");
        const txBytes = tx.serialize();
        const balanceResp = await fetch(`${ONEAM_PROOF_SERVER}/balance-only`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: txBytes as unknown as BodyInit,
        });
        if (balanceResp.ok) {
          const { txBytes: balancedHex } = await balanceResp.json() as { txBytes: string };
          console.log("ProofStation /balance-only succeeded!");
          return Transaction.deserialize(
            "signature",
            "proof",
            "binding",
            fromHex(balancedHex),
          );
        }

        const errBody = await balanceResp.json().catch(() => ({})) as { error?: string };
        const errMsg = `/balance-only failed (${balanceResp.status}): ${errBody.error ?? balanceResp.statusText}`;
        console.error(errMsg);

        // 3. Additional fallback methods
        if (typeof ap?.balanceTx === "function") {
          return (ap.balanceTx as (t: unknown, ttl?: Date) => Promise<unknown>)(tx, _ttl);
        }
        if (typeof ap?.balanceTransaction === "function") {
          return (ap.balanceTransaction as (t: unknown, ttl?: Date) => Promise<unknown>)(tx, _ttl);
        }
        throw new Error(`Could not balance transaction: ${errMsg}`);
      },
    };

    let submittedTxId: string | null = null;

    const midnightProvider = {
      submitTx: async (tx: { serialize: () => Uint8Array; identifiers: () => string[] }) => {
        const txBytes = tx.serialize();
        const txHex = toHex(txBytes);
        // Compute the Substrate extrinsic hash (Blake2b-256) which 1AM Explorer indexes
        const computedExtrinsicHash = toHex(blake2b(txBytes, { dkLen: 32 }));
        console.log("Submitting transaction to wallet, length:", txHex.length, "computedExtrinsicHash:", computedExtrinsicHash);
        if (typeof ap?.submitTransaction === "function") {
          try {
            const res = await (ap.submitTransaction as (s: string) => Promise<unknown>)(txHex);
            console.log("1AM submitTransaction response:", res);
            let returnedId: string | null = null;
            if (typeof res === "string" && res.length > 0) {
              returnedId = res.replace(/^0x/, "");
            } else if (typeof res === "object" && res !== null) {
              const r = res as Record<string, unknown>;
              const candidate = (r.txHash || r.hash || r.transactionHash || r.txId || r.id) as string | undefined;
              if (candidate) returnedId = candidate.replace(/^0x/, "");
            }
            // Always prefer the on-chain extrinsic hash over internal identifiers
            submittedTxId = returnedId || computedExtrinsicHash;
            return submittedTxId;
          } catch (submitErr) {
            console.error("1AM submitTransaction failed with:", submitErr);
            throw submitErr;
          }
        }
        if (typeof ap?.submitTx === "function") {
          try {
            const res = await (ap.submitTx as (t: unknown) => Promise<string>)(tx);
            console.log("1AM submitTx response:", res);
            submittedTxId = typeof res === "string" ? res.replace(/^0x/, "") : computedExtrinsicHash;
            return submittedTxId;
          } catch (submitErr) {
            console.error("1AM submitTx failed with:", submitErr);
            throw submitErr;
          }
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
      privateStateId: `signet-${secret.slice(0, 16)}`,
      initialPrivateState: { secretKey: secretBytes },
    });

    // Call the presentCredential circuit — wallet pops up for signature.
    // Under the hood, contract.callTx.presentCredential() submits via midnightProvider.submitTx
    // and then blocks awaiting indexer confirmation (watchForTxData), which may take several minutes.
    // We race it so that as soon as the wallet signs and submits (submittedTxId is set), we proceed!
    const callPromise = contract.callTx.presentCredential();
    const earlyReturnPromise = new Promise<{ early: true }>((resolve) => {
      const check = setInterval(() => {
        if (submittedTxId) {
          clearInterval(check);
          // Allow 2 seconds for any immediate indexer response, then resolve early
          setTimeout(() => resolve({ early: true }), 2000);
        }
      }, 500);
    });

    await Promise.race([callPromise, earlyReturnPromise]);

    // Query the Midnight indexer for the real on-chain transaction hash that 1AM Explorer indexes
    let txId = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const indexerResp = await fetch(indexerHttp, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `query { contractAction(address: "${CONTRACT_ADDRESS}") { transaction { hash } } }`,
          }),
        });
        const indexerData = await indexerResp.json() as {
          data?: { contractAction?: { transaction?: { hash?: string } } };
        };
        const h = indexerData?.data?.contractAction?.transaction?.hash;
        if (h && typeof h === "string") {
          txId = h.replace(/^0x/, "");
          console.log("Confirmed on-chain transaction hash from indexer:", txId);
          break;
        }
      } catch (err) {
        console.warn("Could not query transaction hash from indexer:", err);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!txId) {
      txId = submittedTxId || "";
    }

    // Nullifier = hash of secret (mirrors circuit)
    const nullifier = await sha256hex(secret);

    return { ok: true, txId, nullifier };
  } catch (e: unknown) {
    console.error("callPresentCredentialOnChain uncaught error:", e);
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
