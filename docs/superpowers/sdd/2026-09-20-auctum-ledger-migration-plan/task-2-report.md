### Task 2: Migrate validate_locale_files.py with locale parity logic

**Brief directive**
- Create: `AUCTUM_LEDGER_LOTSPACE/app/scripts/validate_locale_files.py` (legacy: `work/GREENALMOSATDONE/scripts/validate_locale_files.py`)
- Modify: `AUCTUM_LEDGER_LOTSPACE/app/scripts/i18n_audit.py:25-35` (import and call validation function)
- Create: `AUCTUM_LEDGER_LOTSPACE/app/scripts/__tests__/validate_locale_test.py`

**Interfaces**
- Consumes: Path objects for locale directories, argparse.Namespace
- Produces: Exit codes (0 for success, 1 for validation failures), validation reports

**Report format**
- brief directive
- report format
- commit
- verification
- note the discrepancy about the brief path and the workflow path.

**Commit**
- `ea7e5be` — `feat: add locale validation pipeline from legacy`

**Verification**
- `python -m pytest app/scripts/__tests__/validate_locale_test.py -v` passed (4/4 tests)
- `python scripts/validate_locale_files.py --locale-dir public/locales --strict` ran successfully and returned exit code 1 as expected for the current locale data shape
- `python scripts/i18n_audit.py --locale-dir public/locales` ran successfully and returned exit code 1 as expected for the current locale data shape

**Notes**
- The brief referenced `docs/superpowers/sdd/2026-09-20-auctum-ledger-migration-plan/task-2-brief.md`, but the actual brief file is under `.superpowers/sdd/2026-09-20-auctum-ledger-migration-plan/task-2-brief.md`.
- The brief referenced `AUCTUM_LEDGER_LOTSPACE/app/.github/workflows/i18n.yml`, but the actual workflow file is at `AUCTUM_LEDGER_LOTSPACE/.github/workflows/i18n.yml`.
- `app/scripts/i18n_audit.py` did not exist, so I created it to satisfy the brief's import/call requirement and the workflow step.