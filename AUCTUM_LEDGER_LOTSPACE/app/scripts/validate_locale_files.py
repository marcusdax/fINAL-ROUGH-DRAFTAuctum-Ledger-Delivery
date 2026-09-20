#!/usr/bin/env python3
"""Validate locale JSON files for required top-level and nested keys.

Usage:
  python scripts/validate_locale_files.py --locale-dir public/locales --strict

Exit codes:
  0 = all locale files are valid (or non-strict mode with no critical errors)
  1 = validation failures found (including in strict mode)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List

# Global constraints: Use AL-* prefix, not ALT-*
REQUIRED_TOP_LEVEL_KEYS = {"welcomeMessage", "submitButton", "errorRequired", "validation"}
REQUIRED_NESTED_KEYS = {"email", "phone", "name"}


def validate_locale_file(file_path: Path) -> tuple[bool, List[str]]:
    """Validate a single locale JSON file.

    Args:
        file_path: Path to the locale JSON file to validate.

    Returns:
        Tuple of (is_valid, errors_list). If is_valid is True, errors_list should be empty.
    """
    errors: List[str] = []

    try:
        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        errors.append(f"Invalid JSON: {exc}")
        return False, errors

    # Check top-level required keys
    missing_top_level = REQUIRED_TOP_LEVEL_KEYS - set(data.keys())
    if missing_top_level:
        errors.append(f"Missing top-level keys: {missing_top_level}")

    # Check nested required keys in validation object
    if "validation" in data:
        validation_data = data["validation"]
        if isinstance(validation_data, dict):
            missing_nested = REQUIRED_NESTED_KEYS - set(validation_data.keys())
            if missing_nested:
                errors.append(f"Missing nested validation keys: {missing_nested}")

    return len(errors) == 0, errors


def validate_all_locales(locale_dir: Path) -> tuple[bool, Dict[str, List[str]]]:
    """Validate all JSON files in a locale directory and its subdirectories.

    Args:
        locale_dir: Directory containing locale JSON files to validate.

    Returns:
        Tuple of (all_valid, results_dict). results_dict maps filename to errors list.
    """
    locale_files = list(locale_dir.rglob("*.json"))
    if not locale_files:
        return False, {"error": ["No locale files found"]}

    results: Dict[str, List[str]] = {}
    all_valid = True

    for locale_file in locale_files:
        is_valid, errors = validate_locale_file(locale_file)
        results[str(locale_file.name)] = errors

        if not is_valid:
            all_valid = False

    return all_valid, results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate locale JSON files for required keys.")
    parser.add_argument("--locale-dir", type=Path, required=True,
                       help="Directory containing locale JSON files")
    parser.add_argument("--strict", action="store_true",
                       help="Enable strict validation mode (exit 1 for any errors)")
    args = parser.parse_args(argv)

    if not args.locale_dir.exists():
        print(f"Error: Locale directory '{args.locale_dir}' does not exist")
        return 1

    is_valid, results = validate_all_locales(args.locale_dir)

    print(f"Locale validation results for {args.locale_dir}:")
    all_errors = []
    for file_name, errors in results.items():
        if errors:
            print(f"  [FAIL] {file_name}:")
            for error in errors:
                print(f"     - {error}")
            all_errors.extend(errors)
        else:
            print(f"  [PASS] {file_name}: Valid")

    if args.strict and all_errors:
        print(f"\nStrict validation failed with {len(all_errors)} errors")
        return 1
    elif not is_valid:
        print(f"\nValidation failed with {len(all_errors)} errors (use --strict for exit code 1)")
        return 1
    else:
        print(f"\nAll locale files are valid")
        return 0


if __name__ == "__main__":
    sys.exit(main())