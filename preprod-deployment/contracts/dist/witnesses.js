export const createCredentialPrivateState = (secretKey) => ({
    secretKey: secretKey ?? new Uint8Array(32),
});
export const witnesses = new Proxy({
    credentialSecret: ({ privateState }) => [privateState, new Uint8Array(32)],
    credentialTier: ({ privateState }) => [privateState, 0],
    credentialPath: ({ privateState }) => [
        privateState,
        {
            siblingPath: Array.from({ length: 10 }, () => new Uint8Array(32)),
            leafIndex: 0,
        },
    ],
}, {
    get: (target, prop) => {
        if (prop in target) {
            return target[prop];
        }
        return ({ privateState }) => [privateState, new Uint8Array(32)];
    },
});
//# sourceMappingURL=witnesses.js.map