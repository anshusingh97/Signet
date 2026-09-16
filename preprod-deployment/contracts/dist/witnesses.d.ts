export type CredentialPrivateState = {
    readonly secretKey?: Uint8Array;
};
export declare const createCredentialPrivateState: (secretKey?: Uint8Array) => {
    secretKey: Uint8Array<ArrayBufferLike>;
};
export declare const witnesses: Record<string, any>;
