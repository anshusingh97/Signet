export function PrivacyLedger() {
  return (
    <div className="border border-paper/12 rounded-sm p-6">
      <h3 className="font-display text-lg text-paper mb-4">
        What an observer can see
      </h3>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <p className="font-mono text-[11px] text-verdigris-light mb-2">public</p>
          <ul className="space-y-1.5 text-sm text-paper/75">
            <li>· the gated resource's name</li>
            <li>· the minimum tier the gate requires</li>
            <li>· the running count of successful verifications</li>
            <li>· the set of spent credential nullifiers</li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] text-brass-light mb-2">private</p>
          <ul className="space-y-1.5 text-sm text-paper/75">
            <li>· the credential secret itself</li>
            <li>· the holder's exact tier (only "≥ required" is proved)</li>
            <li>· any link between a nullifier and a holder's identity</li>
            <li>· which credential passed at which moment</li>
          </ul>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-paper/10">
        <p className="text-sm text-paper/60 leading-relaxed">
          Each presentation proves, in zero-knowledge, that the caller
          holds a credential issued by the trusted issuer, at or above the
          required tier, and hasn't used it here before —{" "}
          <em className="not-italic text-paper/80">
            without revealing which credential, or its exact tier
          </em>
          .
        </p>
      </div>
    </div>
  );
}
