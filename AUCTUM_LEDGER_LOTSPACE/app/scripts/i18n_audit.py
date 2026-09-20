#!/usr/bin/env python3
"""Audit i18n locale files for key parity and required fields.

Usage:
  python scripts/i18n_audit.py --locale-dir public/locales

Exit codes:
  0 = audit passed
  1 = audit failed
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Set

# Import and call the validation function from validate_locale_files
from validate_locale_files import validate_all_locales


def audit_locale_keys(locale_dir: Path) -> tuple[bool, List[str]]:
    """Check that all locale JSON files have the same top-level keys."""
    locale_files = sorted(locale_dir.rglob("*.json"))
    if not locale_files:
        return False, ["No locale files found"]

    key_sets: Dict[str, Set[str]] = {}
    for f in locale_files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            key_sets[f.name] = set(data.keys())
        except json.JSONDecodeError as exc:
            return False, [f"Invalid JSON in {f.name}: {exc}"]

    base_keys = key_sets[locale_files[0].name]
    errors: List[str] = []
    all_valid = True
    for name, keys in key_sets.items():
        missing = base_keys - keys
        extra = keys - base_keys
        if missing or extra:
            all_valid = False
            if missing:
                errors.append(f"{name} missing top-level keys: {missing}")
            if extra:
                errors.append(f"{name} has extra top-level keys: {extra}")

    return all_valid, errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit i18n locale files.")
    parser.add_argument("--locale-dir", type=Path, required=True)
    args = parser.parse_args(argv)

    if not args.locale_dir.exists():
        print(f"Error: Locale directory '{args.locale_dir}' does not exist")
        return 1

    # Run required-field validation via imported function
    is_valid, results = validate_all_locales(args.locale_dir)
    print("Required-field validation results:")
    for file_name, errors in results.items():
        if errors:
            print(f"  [FAIL] {file_name}: {'; '.join(errors)}")
        else:
            print(f"  [PASS] {file_name}: Valid")

    # Run key parity audit
    parity_valid, parity_errors = audit_locale_keys(args.locale_dir)
    print("Key parity audit results:")
    for err in parity_errors:
        print(f"  [FAIL] {err}")
    if parity_valid and not parity_errors:
        print("  [PASS] All locale files have consistent top-level keys")

    all_valid = is_valid and parity_valid
    if all_valid:
        print("[PASS] Locale audit passed")
        return 0
    else:
        print("[FAIL] Locale audit failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())