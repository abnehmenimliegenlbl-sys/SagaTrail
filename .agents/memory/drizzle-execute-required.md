---
name: Drizzle fire-and-forget needs .execute()
description: Drizzle query builders do not execute without .execute() or await — plain .catch() alone is a silent no-op.
---

# Drizzle fire-and-forget needs .execute()

## The rule
Always call `.execute()` before `.catch()` for fire-and-forget DB writes in Drizzle. Never rely on `.catch()` alone to trigger execution.

```typescript
// WRONG — silently does nothing
db.update(table).set(data).where(cond)
  .catch((err) => log.warn(err));

// CORRECT — executes the query, errors are caught
db.update(table).set(data).where(cond)
  .execute()
  .catch((err) => log.warn(err));
```

**Why:** Drizzle's query builder returns a `PromiseLike` object but does not auto-execute on `.catch()`. Only `.execute()`, `await`, or `.then()` trigger actual DB execution. Calling just `.catch()` attaches a rejection handler to an unexecuted builder and never runs the query.

**How to apply:** Any time you write a non-awaited (fire-and-forget) DB mutation — especially in response handlers where you don't want to delay the response — always add `.execute()` before `.catch()`. Verified in production: saga photo writeback in `/api/sagas/photo` was silently not persisting because `.execute()` was missing.
