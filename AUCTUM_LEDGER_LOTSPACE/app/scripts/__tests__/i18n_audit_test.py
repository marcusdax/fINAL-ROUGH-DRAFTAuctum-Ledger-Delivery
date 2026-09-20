import json
from pathlib import Path

def test_i18n_audit_validates_locale_keys():
    with open("app/public/locales/en-US/common.json") as f:
        en_data = json.load(f)
    with open("app/public/locales/zh-CN/common.json") as f:
        zh_data = json.load(f)
    en_keys = set(en_data.keys())
    zh_keys = set(zh_data.keys())
    assert en_keys == zh_keys, f"Locale key mismatch: {en_keys.symmetric_difference(zh_keys)}"
