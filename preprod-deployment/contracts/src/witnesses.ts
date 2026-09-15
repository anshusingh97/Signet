export type CredentialPrivateState = {
  readonly secretKey?: Uint8Array;
};

export const createCredentialPrivateState = (secretKey?: Uint8Array) => ({
  secretKey: secretKey ?? new Uint8Array(32),
});

export const witnesses: Record<string, any> = new Proxy(
  {
    credentialSecret: ({ privateState }: any) => [privateState, new Uint8Array(32)],
    credentialTier: ({ privateState }: any) => [privateState, 0],
    credentialPath: ({ privateState }: any) => [
      privateState,
      {
        siblingPath: Array.from({ length: 10 }, () => new Uint8Array(32)),
        leafIndex: 0,
      },
    ],
  },
  {
    get: (target: any, prop: string | symbol) => {
      if (prop in target) {
        return target[prop];
      }
      return ({ privateState }: any) => [privateState, new Uint8Array(32)];
    },
  }
);
