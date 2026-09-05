---
name: OpenAPI Zod codegen compatibility
description: Orval's generated Zod syntax must match the installed Zod major version.
---

Orval 8 can generate Zod 4 helpers such as `zod.int()` when the version is detected automatically. This workspace's shared catalog still uses Zod 3 for database tooling, so generated API validation needs its own Zod 4 dependency rather than relying on the catalog version.

**Why:** Code generation succeeded but the shared library typecheck failed when generated Zod 4 syntax was compiled against Zod 3.

**How to apply:** If the API contract changes or codegen is upgraded, keep the generated API package's Zod dependency and Orval version settings aligned, then run the library typecheck immediately after codegen.