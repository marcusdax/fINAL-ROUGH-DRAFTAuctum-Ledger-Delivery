import json
import os
import sys
import tempfile
from pathlib import Path

# Ensure the script directory is importable.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import validate_locale_files  # noqa: E402


def test_validate_locale_files_enforces_required_fields() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        valid_locale = {
            "welcomeMessage": "Welcome",
            "submitButton": "Submit",
            "errorRequired": "This field is required",
            "validation": {
                "email": "Invalid email format",
                "phone": "Invalid phone format",
                "name": "Invalid name format",
            },
        }
        locale_file = temp_path / "common.json"
        locale_file.write_text(json.dumps(valid_locale, indent=2), encoding="utf-8")

        is_valid, results = validate_locale_files.validate_all_locales(temp_path)
        assert is_valid is True, f"Expected valid locale but got errors: {results}"
        assert results["common.json"] == []


def test_validate_locale_files_rejects_missing_top_level_fields() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        invalid_locale = {
            "welcomeMessage": "Welcome",
        }
        locale_file = temp_path / "common.json"
        locale_file.write_text(json.dumps(invalid_locale, indent=2), encoding="utf-8")

        is_valid, results = validate_locale_files.validate_all_locales(temp_path)
        assert is_valid is False, "Expected invalid locale for missing fields"
        errors = results["common.json"]
        missing = {err for err in errors if "Missing top-level keys" in err}
        assert missing, f"Expected top-level key errors, got: {errors}"


def test_validate_locale_files_rejects_missing_nested_fields() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        invalid_locale = {
            "welcomeMessage": "Welcome",
            "submitButton": "Submit",
            "errorRequired": "This field is required",
            "validation": {
                "email": "Invalid email format",
            },
        }
        locale_file = temp_path / "common.json"
        locale_file.write_text(json.dumps(invalid_locale, indent=2), encoding="utf-8")

        is_valid, results = validate_locale_files.validate_all_locales(temp_path)
        assert is_valid is False, "Expected invalid locale for missing nested fields"
        errors = results["common.json"]
        missing = {err for err in errors if "Missing nested validation keys" in err}
        assert missing, f"Expected nested key errors, got: {errors}"


def test_validate_locale_files_returns_exit_codes() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        valid_locale = {
            "welcomeMessage": "Welcome",
            "submitButton": "Submit",
            "errorRequired": "This field is required",
            "validation": {
                "email": "Invalid email format",
                "phone": "Invalid phone format",
                "name": "Invalid name format",
            },
        }
        locale_file = temp_path / "common.json"
        locale_file.write_text(json.dumps(valid_locale, indent=2), encoding="utf-8")

        exit_code = validate_locale_files.main(["--locale-dir", str(temp_path)])
        assert exit_code == 0, "Valid locale should return exit code 0"

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        invalid_locale = {"welcomeMessage": "Welcome"}
        locale_file = temp_path / "common.json"
        locale_file.write_text(json.dumps(invalid_locale, indent=2), encoding="utf-8")

        exit_code = validate_locale_files.main(["--locale-dir", str(temp_path)])
        assert exit_code == 1, "Invalid locale should return exit code 1"

        exit_code_strict = validate_locale_files.main(
            ["--locale-dir", str(temp_path), "--strict"]
        )
        assert exit_code_strict == 1, "Invalid locale in strict mode should return exit code 1"
