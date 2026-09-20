# Task 1 Report: Reconcile Python scripts from legacy folder

## Status: done

## Commits:
- a6d877e feat: migrate i18n_audit script from legacy

## Test summary:
- All 4 tests in `validate_locale_test.py` PASSED
- Test coverage:
  - `test_validate_locale_files_enforces_required_fields`: Validates that locale files with all required top-level keys (welcomeMessage, submitButton, errorRequired, validation) and nested validation keys (email, phone, name) pass validation (exit code 0)
  - `test_validate_locale_files_rejects_missing_fields`: Validates that locale files missing required top-level keys fail validation (exit code 1)
  - `test_validate_locale_files_missing_nested_keys`: Validates that locale files with missing nested validation keys fail validation (exit code 1)
  - `test_validate_locale_files_strict_mode`: Validates that `--strict` flag enforces additional checks (no extra keys, no empty values)

## Concerns:
1. **Workflow path discrepancy**: The user instructions referenced `AUCTUM_LEDGER_LOTSPACE/app/.github/workflows/i18n.yml`, but the actual workflow file is located at `AUCTUM_LEDGER_LOTSPACE/.github/workflows/i18n.yml` (project root level, not inside `app/`). The modification was applied to the correct existing file.

2. **Locale file structure**: The existing locale files in `app/public/locales/<locale>/*.json` use a different schema (namespace-based keys like `appName`, `tagline`, `nav`) than the required keys (`welcomeMessage`, `submitButton`, `errorRequired`, `validation` with nested `email`, `phone`, `name`). Running the new validation scripts against actual locale files will fail. This is expected — the task only required creating the scripts and CI steps, not fixing the locale files themselves.

3. **Windows Unicode encoding**: The scripts originally used Unicode emojis (✅, ❌) which caused `UnicodeEncodeError` on Windows CP1252 consoles. Fixed by replacing with ASCII `[OK]` and `[FAIL]` markers.

4. **Locale directory structure**: The scripts recursively search for JSON files under `--locale-dir` using `rglob("*.json")`, which correctly handles the nested locale structure (`app/public/locales/en-US/*.json`, `app/public/locales/zh-CN/*.json`, etc.).

## Files Created:
- `AUCTUM_LEDGER_LOTSPACE/app/scripts/i18n_audit.py` — Audits locale JSON key consistency across all locale files. Accepts `--locale-dir` as required `Path` argument.
- `AUCTUM_LEDGER_LOTSPACE/app/scripts/validate_locale_files.py` — Validates locale JSON files for required top-level keys and nested validation keys. Accepts `--locale-dir` (required `Path`) and `--strict` (optional flag). Returns exit code 0 on success, 1 on failure.
- `AUCTUM_LEDGER_LOTSPACE/app/scripts/__tests__/validate_locale_test.py` — Tests covering required fields and missing fields scenarios.

## Files Modified:
- `AUCTUM_LEDGER_LOTSPACE/.github/workflows/i18n.yml` — Added steps to run:
  - `python3 app/scripts/validate_locale_files.py --locale-dir app/public/locales --strict`
  - `python3 app/scripts/i18n_audit.py --locale-dir app/public/locales`

## Verification:
```bash
# Run tests
pytest AUCTUM_LEDGER_LOTSPACE/app/scripts/__tests__/validate_locale_test.py -v
# Result: 4 passed in 0.55s

# Run i18n audit script
python3 app/scripts/i18n_audit.py --locale-dir app/public/locales
# Result: Successfully audits key counts across all locale files

# Run validation script (expected to fail on actual locale files due to schema mismatch)
python3 app/scripts/validate_locale_files.py --locale-dir app/public/locales --strict
# Result: Correctly identifies missing required keys in all locale namespace files
```