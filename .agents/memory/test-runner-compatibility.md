---
name: TypeScript test runner compatibility
description: Native Node TypeScript tests need explicit extensions and matching compiler settings.
---

Node's native type-stripping test runner resolves TypeScript imports as ESM, so test imports need explicit `.ts` extensions and the package TypeScript config must allow those extensions.

**Why:** Tests passed under Node but failed typecheck until the runtime resolver and compiler settings agreed.

**How to apply:** For lightweight TypeScript tests that use Node's built-in runner, keep explicit `.ts` imports and `allowImportingTsExtensions` enabled in that package.