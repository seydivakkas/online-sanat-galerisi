# P3 — Stacked PR reconciliation validation

GitHub merge-history reconciliation was performed on 2026-10-16 for the
following order:

`PR #1 → #4 → #5 → #7 → #8 → #9`.

## Integrity checks applied before every reconciliation commit

- Backend `package-lock.json`: byte-identical to the target branch.
- Backend `package.json`: same production dependencies and npm overrides;
  all previous-stage test scripts preserved.
- Security workflow: all previous-stage job steps retained and
  `npm audit --omit=dev --audit-level=low` enforced.
- Parent's amended engineering documents propagated into the child branch.
- Child feature tree retained; the parent was added as an additional
  commit parent without rewriting previous feature commits.

## Release-gate commands

These execute against synthetic/disposable data, not a customer's database:

```sh
cd backend
npm ci
npm run test:security
npm run test:payments
npm run test:integrity
npm run test:admin
npm run test:migrations
npm audit --omit=dev --audit-level=low
cd ../frontend
npm ci
npm run build
```

The P3 Windows GitHub Actions workflow additionally runs PowerShell installation,
a temporary SQLite migration check, local API health/catalog checks and
same-origin React rendering.

**Passing CI does not approve production rollout.** Open release blockers:
Issue #6 (real database migration/restore, PostgreSQL concurrency, Windows
end-user acceptance, bank reconciliation and post-shipment return policy).

All staged PRs remain DRAFT; this file does not authorize a merge to master.
