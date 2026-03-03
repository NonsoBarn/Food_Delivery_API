/**
 * CJS shim for uuid v13 (which is pure ESM).
 *
 * Jest runs in CommonJS mode and can't import ESM packages directly.
 * This shim re-exports the uuid functions we use (v4) via Node's built-in
 * crypto.randomUUID(), so E2E tests don't need to transform the uuid package.
 *
 * The moduleNameMapper in jest-e2e.json points "^uuid$" here instead of
 * the real uuid package, only during testing.
 */
'use strict';

const crypto = require('crypto');

module.exports = {
  v4: () => crypto.randomUUID(),
  v1: () => crypto.randomUUID(),
  v3: () => crypto.randomUUID(),
  v5: () => crypto.randomUUID(),
};
