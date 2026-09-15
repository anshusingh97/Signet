import { useMemo, useState } from "react";
import { Header } from "./components/Header";
import { CredentialCard } from "./components/CredentialCard";
import { VerificationLedger } from "./components/VerificationLedger";
import { PrivacyLedger } from "./components/PrivacyLedger";
import { useLaceWallet } from "./hooks/useLaceWallet";
import { openGate } from "./lib/credentialSimulator";
import { WalletConnectModal } from "./components/WalletConnectModal";
import { explorerContractUrl } from "./lib/onchain";

const RESOURCE_NAME = "Verified Builders Channel";
const REQUIRED_TIER = 3;

function App() {
  const wallet = useLaceWallet();
  const gate = useMemo(() => openGate(RESOURCE_NAME, REQUIRED_TIER), []);
  const [, forceRender] = useState(0);
  const [showModal, setShowModal] = useState(false);

  async function handleConnectRequest() {
    setShowModal(true);
  }

  async function handleModalConfirm() {
    setShowModal(false);
    await wallet.connect();
  }

  return (
    <div className="min-h-screen bg-graphite flex flex-col">
      {/* Wallet Connect Modal */}
      {showModal && (
        <WalletConnectModal
          onConfirm={handleModalConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}

      <Header
        status={wallet.status}
        address={wallet.address}
        error={wallet.error}
        onConnect={handleConnectRequest}
        onDisconnect={wallet.disconnect}
      />

      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <section className="mb-10">
          <p className="font-mono text-[11px] text-paper/40 mb-3">
            🌓 first quarter — half light, half shadow
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-paper leading-tight max-w-xl">
            Prove who vouches for you, without showing them the paper.
          </h1>
          <p className="text-paper/60 mt-3 max-w-lg leading-relaxed">
            Present a credential below. The gate checks it was genuinely issued
            and meets the required tier — and records only that a valid credential
            passed, never which one, or exactly how qualified it was.
          </p>
          <a
            href={explorerContractUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] text-paper/35 hover:text-verdigris-light transition-colors mt-3"
          >
            ↗ gate contract on Midnight Preprod Explorer
          </a>
        </section>

        <section className="mb-10">
          <CredentialCard
            gate={gate}
            onVerified={() => forceRender((n) => n + 1)}
            walletApi={wallet.api}
            walletStatus={wallet.status}
          />
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <VerificationLedger gate={gate} />
          <PrivacyLedger />
        </section>
      </main>

      <footer className="border-t border-paper/10">
        <div className="mx-auto max-w-3xl px-6 py-6 flex flex-col sm:flex-row justify-between gap-2">
          <p className="font-mono text-[11px] text-paper/35">
            built on midnight · compact contracts
          </p>
          <p className="font-mono text-[11px] text-paper/35">
            level 3 · first quarter submission
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
