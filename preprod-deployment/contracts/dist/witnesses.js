export const createCredentialPrivateState = (secretKey) => ({
    secretKey: secretKey ?? new Uint8Array(32),
});
export const witnesses = new Proxy({
    credentialSecret: ({ privateState }) => [privateState, new Uint8Array(32)],
    credentialTier: ({ privateState }) => [privateState, 0n],
    credentialPath: ({ privateState }) => [
        privateState,
        {
            leaf: new Uint8Array(32),
            path: Array.from({ length: 10 }, () => ({
                sibling: { field: 0n },
                goes_left: false,
            })),
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