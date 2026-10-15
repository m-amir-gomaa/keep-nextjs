# Noteweld operations — 15 October 2026

## Scope and least privilege

The hosted preview uses a **new** database and login role on the existing Neon project, separate from the old Keep database. The original credential files and original two accounts are preserved. Migration credentials remain private on the owner's machine; only the new runtime role is sent to Modal. It has connection/schema-usage/table CRUD privileges, no database/schema creation or role-management privileges. All app queries enforce ownership; PostgreSQL RLS is not claimed.

The Modal app/secret/backup volume are `noteweld`, `noteweld-runtime`, `noteweld-backups-v1`. `AUTH_SECRET` is unique to this app. It is not a Sonaweft/Pageweft shared login or wallet. There is one CPU web container, maximum 20 concurrent inputs, 3 database connections, 1536 MiB RAM, no GPU and no always-on minimum. Cold starts are expected. Neon compute can suspend, but retained storage, maintenance and real provider usage are not a universal $0 billing guarantee. Provider-wide hard spending caps/automatic external alerts have not been verified.

Signup is capped at 100 total accounts and 50 new attempts/day; IP and account login/recovery throttles live in PostgreSQL. Trusted proxy handling uses the final forwarded address, and global caps remain even if that header cannot be trusted. Quotas count trash too; restore does not bypass them. There is no polling or advertising/third-party analytics script. Logs return generic errors and omit request contents; provider access logs have separate retention.

## Owner actions

Create a project operations venv with `python -m venv .venv-operations` and install `requirements-operations.txt`; authenticate your own Modal profile. Never send connection URLs, keys, recovery secrets or dumps to chat/Git.

```sh
.venv-operations/bin/python scripts/owner.py report
.venv-operations/bin/python scripts/owner.py maintain
.venv-operations/bin/python scripts/owner.py backup --output .local/backups/noteweld-NEW.fernet
```

Reports show aggregate counts only. Maintenance removes counters older than two days and writes an encrypted daily backup, retaining seven daily files. This also runs at 02:23 UTC daily. Encryption uses an independent BACKUP_KEY stored in the provider secret; securely save a separate owner copy. Losing the key makes backups unreadable. No public admin/backup endpoint exists. Manually downloaded backups need owner-controlled retention; do not leave them indefinitely.

For incidents: stop new access by stopping the Modal app in the authenticated dashboard, inspect aggregate logs and Neon availability privately, fix/redeploy, then verify health/login and restore access. No user content is needed in logs. Cookie resets/recovery revoke all prior sessions by database sessionVersion. Deletion cascades through notes/labels; live reads then reject old cookies. Existing unrelated provider apps are not stopped.

## Deployment and rollback

1. Pin reviewed source and run unit/lint/types, isolated migrations/database/browser checks and build. Inspect outgoing Git diff for secrets. Never execute automatic migrations against the old Keep database.
2. For a fresh isolated database, migrate with an explicit privileged DATABASE_URL in the process environment; grant the restricted runtime role usage and CRUD on that new database's public schema/tables. Retain migration access locally. For an existing database, first take a backup and audit case-folded email/label collisions. Migration 0002 intentionally fails on duplicates; resolve ownership explicitly instead of auto-merging accounts.
3. Create `noteweld-runtime` from a private JSON file with DATABASE_URL, AUTH_SECRET, AUTH_URL and AUTH_TRUST_HOST=true; BACKUP_KEY is also required by owner backup/maintenance functions. Use `modal secret create ... --from-json PRIVATE_PATH`; use `--force` only to update that same app's reviewed values. Preserve AUTH_SECRET and BACKUP_KEY during routine releases.
4. Deploy with `python -m modal deploy app.py`. Record the **actual returned hostname**, update AUTH_URL to that exact HTTPS origin and redeploy. Use a private immutable staging copy if editing source while the remote build runs. The app image allowlists files and cannot include local credential files.
5. Verify `/api/health`, production CSP, no-cache responses and an actual synthetic account/create/reload/recovery/delete journey on the returned URL. Then update portfolio links. Billing stays closed.
6. Code rollback: deploy the preceding reviewed source with the same new database/secret. Do not blindly reverse migrations or point the preview at the original Keep database. For a data incident, restore a backup to a **new empty database**, verify it, then update only this app's DATABASE_URL and redeploy. Keep the damaged database intact for investigation until recovery is confirmed.

## Restore on a new target

Decrypt the Fernet snapshot **locally** using the separately stored BACKUP_KEY, writing a mode-0600 temporary file in a private directory. Validate `format=noteweld-backup`, version=1. The snapshot includes account password/recovery hashes and private note text; never print it. `scripts/backup-format.mjs` verifies table/column names, locks all four app tables and refuses any non-empty target.

Create a new empty PostgreSQL database, apply this source's migrations with privileged access, and set NOTEWELD_RESTORE_DATABASE_URL to that exact target using private environment handling. Run:

```sh
node scripts/restore.mjs PRIVATE_DECRYPTED_FILE EXACT_NEW_DATABASE_NAME
```

Compare counts, representative note/checklist content, labels and login/recovery in the clone before a cutover. Delete the temporary plaintext file after the check. The automated local test restores actual synthetic records into a fresh temporary database and confirms a second restore cannot overwrite it. This does not justify restoring into the old live Keep database. Neon provider recovery retention is separate from these seven-day application backups.

## Primary/installed references

- Installed Next 16.3.8: `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`, proxy/error conventions and `03-api-reference/05-config/01-next-config-js/output.md`.
- [Drizzle transactions](https://orm.drizzle.team/docs/transactions), [Neon role access](https://neon.com/docs/manage/roles).
- [Modal web servers](https://modal.com/docs/guide/webhooks), [image builds](https://modal.com/docs/guide/images), [secrets](https://modal.com/docs/guide/secrets), [volumes](https://modal.com/docs/guide/volumes).
- [NIST password guidance](https://pages.nist.gov/800-63-4/sp800-63b.html): the 15-character new-password minimum follows password-only guidance; full NIST compliance is not claimed.
