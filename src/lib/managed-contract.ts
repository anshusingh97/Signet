// Re-export the Midnight Contract class directly from the compiled source.
// This bypasses @midnight-ntwrk/bboard-contract's dist/index.js and its
// CompiledContract wrapper which causes "Class extends value undefined" in
// browser environments because midnight-js-protocol is not browser-safe.
export { Contract } from "../../preprod-deployment/contracts/dist/managed/bboard/contract/index.js";
export { witnesses } from "../../preprod-deployment/contracts/dist/witnesses.js";
