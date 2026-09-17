export type CredentialPrivateState = {
  readonly secretKey?: Uint8Array;
};

export const createCredentialPrivateState = (secretKey?: Uint8Array) => ({
  secretKey: secretKey ?? new Uint8Array(32),
});

export const witnesses: Record<string, any> = new Proxy(
  {
    credentialSecret: ({ privateState }: any) => [privateState, new Uint8Array(32)],
    credentialTier: ({ privateState }: any) => [privateState, 0n],
    credentialPath: ({ privateState }: any) => [
      privateState,
      {
        leaf: new Uint8Array(32),
        path: Array.from({ length: 10 }, () => ({
          sibling: { field: 0n },
          goes_left: false,
        })),
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
