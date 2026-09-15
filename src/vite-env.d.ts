/// <reference types="vite/client" />

declare module "@midnight-ntwrk/midnight-js-indexer-public-data-provider" {
  export function indexerPublicDataProvider(http: string, ws: string): unknown;
}

declare module "@midnight-ntwrk/midnight-js-http-client-proof-provider" {
  export function httpClientProofProvider(url: string, zkConfigProvider: unknown): unknown;
}

declare module "@midnight-ntwrk/midnight-js-level-private-state-provider" {
  export function levelPrivateStateProvider(config: Record<string, unknown>): unknown;
}

declare module "@midnight-ntwrk/midnight-js-node-zk-config-provider" {
  export class NodeZkConfigProvider {
    constructor(path: string);
  }
}

declare module "@midnight-ntwrk/midnight-js-contracts" {
  export function deployedContract(
    providers: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<{
    presentCredential: () => Promise<Record<string, unknown>>;
    [key: string]: unknown;
  }>;
  export function callTx(circuit: unknown): () => Promise<{
    txId?: string;
    hash?: string;
    id?: string;
    [key: string]: unknown;
  }>;
}

declare module "@midnight-ntwrk/bboard-contract" {
  export const CompiledBBoardContractContract: unknown;
}
