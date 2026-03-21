// Pre-export only the symbols that plugin-sdk/matrix re-exports from this
// extension via helper-api.js and thread-bindings-runtime.js.  These must be
// defined before the star re-export so Jiti's CJS interop guard
// (hasOwnProperty check) skips the duplicate definition that would otherwise
// come through the circular alias round-trip.
export {
  requiresExplicitMatrixDefaultAccount,
  resolveMatrixDefaultOrOnlyAccountId,
} from "./account-selection.js";
export { getMatrixScopedEnvVarNames } from "./env-vars.js";
export {
  resolveMatrixAccountStorageRoot,
  resolveMatrixCredentialsDir,
  resolveMatrixCredentialsPath,
  resolveMatrixLegacyFlatStoragePaths,
} from "./storage-paths.js";
export {
  setMatrixThreadBindingIdleTimeoutBySessionKey,
  setMatrixThreadBindingMaxAgeBySessionKey,
} from "./matrix/thread-bindings-shared.js";
// Star re-export for the remaining (non-extension) symbols in plugin-sdk/matrix.
// Properties already defined above are skipped by the CJS interop guard, so the
// circular helper-api path is never reached for those symbols.
export * from "openclaw/plugin-sdk/matrix";
export {
  assertHttpUrlTargetsPrivateNetwork,
  closeDispatcher,
  createPinnedDispatcher,
  resolvePinnedHostnameWithPolicy,
  ssrfPolicyFromAllowPrivateNetwork,
  type LookupFn,
  type SsrFPolicy,
} from "openclaw/plugin-sdk/infra-runtime";
export {
  dispatchReplyFromConfigWithSettledDispatcher,
  ensureConfiguredAcpBindingReady,
  maybeCreateMatrixMigrationSnapshot,
  resolveConfiguredAcpBindingRecord,
} from "openclaw/plugin-sdk/matrix-runtime-heavy";
// Keep auth-precedence available internally without re-exporting helper-api
// twice through both plugin-sdk/matrix and ../runtime-api.js.
export * from "./auth-precedence.js";
