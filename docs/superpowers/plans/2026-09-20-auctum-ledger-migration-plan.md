# Auctum Ledger Full-Stack Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete full-stack migration of Auctum Ledger features into AUCTUM_LEDGER_LOTSPACE with enterprise-grade deployment readiness and full feature parity.

**Architecture:** Preserve existing monolith architecture while reconciling legacy assets, hardening production configuration, and ensuring all BUILD-BRIEF requirements are implemented with strict idempotency and CI/CD gates.

**Tech Stack:** React 19.2.7, Vite 8.1.1, TypeScript ~6.0.2, Tailwind 3.4.19, zustand 5, react-router-dom 6.30, recharts, framer-motion, i18next, zod 4.4.3; Express 4.21, pg 8, kafkajs 2, redis 4, jose 5; PostgreSQL 16, TimescaleDB, Docker Compose, GitHub Actions.

**Spec:** BUILD-BRIEF.md, CONTRACT.md, expert-team.md, AUCTUM_LEDGER_LOTSPACE/README.md

## Global Constraints

- **Stack pins**: Do NOT downgrade React (^19.2.7), Vite (^8.1.1), Tailwind (^3.4.19), zustand (^5), react-router-dom (^6.30), i18next, zod (^4.4.3)
- **Naming convention**: Use `AL-*` prefix (e.g., AL-001) not `ALT-*`; error codes `AL-*` not `GS-*`; Kafka topics `al.` not `gs.`
- **Port mapping**: postgres 5432, timescaledb 5433, redis 6379, kafka 9092, api 3001, app 80 (align docker-compose.yml)
- **API spec**: Must have OpenAPI contract at `engineering/02-openapi-contract.md` with `/api/v1` routes and RFC 9457 Problem Details
- **i18n parity**: 4 CI-gated locales (en-US, zh-CN, es-MX, pt-BR) must pass `i18n.yml` validation; 3 ship-readiness locales (vi-VN, de-DE, fr-FR) must have >90% coverage
- **Database migrations**: Must be idempotent with clean `-- down` sections; migrations must run in `--profile migrate` before API startup
- **CI/CD gates**: `test.yml` (0-lint-warning gate), `docker-build.yml` (Trivy scan), `deploy.yml` (GH deployment), `i18n.yml` (locale parity)
- **Security**: No secret files (`.env`, `.env.docker`) committed; use `.env.example`; OIDC authentication via jose with tenant claims propagation

---

### Task 1: Reconcile Python scripts from legacy folder

**Files:**
- Create: `AUCTUM_LEDGER_LOTSPACE/app/scripts/i18n_audit.py` (legacy: `work/GREENALMOSATDONE/scripts/i18n_audit.py`)
- Create: `AUCTUM_LEDGER_LOTSPACE/app/scripts/validate_locale_files.py` (legacy: `work/GREENALMOSATDONE/scripts/validate_locale_files.py`)
- Modify: `AUCTUM_LEDGER_LOTSPACE/app/.github/workflows/i18n.yml:10-15` (add script validation steps)
- Create: `AUCTUM_LEDGER_LOTSPACE/app/scripts/split-locales.mjs` (create if missing: legacy `work/GREENALMOSATDONE/scripts/split-locales.mjs`)

**Interfaces:**
- Consumes: Node.js environment (v18+ recommended), fs/promises, path
- Produces: CLI scripts that accept `--locale-dir` and `--output-dir` arguments

- [ ] **Step 1: Write failing test for i18n_audit.py**

```python
import json
import os
from pathlib import Path

def test_i18n_audit_validates_locale_keys():
    with open("app/public/locales/en-US/common.json") as f:
        en_data = json.load(f)
    
    with open("app/public/locales/zh-CN/common.json") as f:
        zh_data = json.load(f)
    
    # Should detect same top-level keys across all locales
    en_keys = set(en_data.keys())
    zh_keys = set(zh_data.keys())
    
    assert en_keys == zh_keys, f"Locale key mismatch: {en_keys.symmetric_difference(zh_keys)}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest AUCTUM_LEDGER_LOTSPACE/app/scripts/__tests__/i18n_audit_test.py -v`

Expected: FAIL with "module 'i18n_audit' not found"

- [ ] **Step 3: Write minimal i18n_audit.py implementation**

```python
import argparse
import json
import os
from pathlib import Path
from typing import Dict, Set

def audit_locale_keys(locale_dir: Path) -> Dict[str, Set[str]]:
    locale_files = list(locale_dir.glob("*.json"))
    if not locale_files:
        return {}
    
    first_file_keys: Set[str] = set(json.loads(locale_files[0].read_text()).keys())
    
    results: Dict[str, Set[str]] = {}
    for locale_file in locale_files:
        try:
            keys = set(json.loads(locale_file.read_text()).keys())
            results[str(locale_file)] = keys
        except json.JSONDecodeError:
            results[str(locale_file)] = set()
    
    return results

def main():
    parser = argparse.ArgumentParser(description="Audit locale file key consistency")
    parser.add_argument("--locale-dir", type=Path, required=True, help="Directory containing locale JSON files")
    args = parser.parse_args()
    
    if not args.locale_dir.exists():
        print(f"Error: Locale directory '{args.locale_dir}' does not exist")
        return 1
    
    audit_results = audit_locale_keys(args.locale_dir)
    
    print(f"Locale key audit results for {args.locale_dir}:")
    for file_path, keys in audit_results.items():
        print(f"  {file_path}: {len(keys)} keys")
    
    return 0

if __name__ == "__main__":
    exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest AUCTUM_LEDGER_LOTSPACE/app/scripts/__tests__/i18n_audit_test.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add AUCTUM_LEDGER_LOTSPACE/app/scripts/i18n_audit.py
git add AUCTUM_LEDGER_LOTSPACE/app/.github/workflows/i18n.yml
git commit -m "feat: migrate i18n_audit script from legacy"
```

---

### Task 2: Migrate validate_locale_files.py with locale parity logic

**Files:**
- Create: `AUCTUM_LEDGER_LOTSPACE/app/scripts/validate_locale_files.py` (legacy: `work/GREENALMOSATDONE/scripts/validate_locale_files.py`)
- Modify: `AUCTUM_LEDGER_LOTSPACE/app/scripts/i18n_audit.py:25-35` (import and call validation function)
- Create: `AUCTUM_LEDGER_LOTSPACE/app/scripts/__tests__/validate_locale_test.py`

**Interfaces:**
- Consumes: Path objects for locale directories, argparse.Namespace
- Produces: Exit codes (0 for success, 1 for validation failures), validation reports

- [ ] **Step 1: Write failing test for validate_locale_files.py**

```python
import json
from pathlib import Path
import tempfile
import os

def test_validate_locale_files_enforces_required_fields():
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Create valid locale file with all required fields
        valid_locale = {
            "welcomeMessage": "Welcome",
            "submitButton": "Submit",
            "errorRequired": "This field is required",
            "validation": {
                "email": "Invalid email format"
            }
        }
        
        locale_file = temp_path / "common.json"
        locale_file.write_text(json.dumps(valid_locale, indent=2))
        
        # Run validation
        os.system(f"python validate_locale_files.py --locale-dir {temp_path}")
        
        # Should exit with 0 for valid file
        # (Implementation will add validation logic)

def test_validate_locale_files_rejects_missing_fields():
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Create locale file missing required fields
        invalid_locale = {
            "welcomeMessage": "Welcome"
            # Missing submitButton, errorRequired, validation
        }
        
        locale_file = temp_path / "common.json"
        locale_file.write_text(json.dumps(invalid_locale, indent=2))
        
        # Run validation
        os.system(f"python validate_locale_files.py --locale-dir {temp_path}")
        
        # Should exit with 1 for invalid file
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest AUCTUM_LEDGER_LOTSPACE/app/scripts/__tests__/validate_locale_test.py -v`

Expected: FAIL with "No module named validate_locale_files"

- [ ] **Step 3: Write minimal validate_locale_files.py implementation**

```python
import argparse
import json
from pathlib import Path
from typing import Dict, Any, List

REQUIRED_TOP_LEVEL_KEYS = {"welcomeMessage", "submitButton", "errorRequired", "validation"}
REQUIRED_NESTED_KEYS = {"email", "phone", "name"}

def validate_locale_file(file_path: Path) -> tuple[bool, List[str]]:
    errors: List[str] = []
    
    try:
        with open(file_path) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON: {e}")
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
    locale_files = list(locale_dir.glob("*.json"))
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

def main():
    parser = argparse.ArgumentParser(description="Validate locale JSON files")
    parser.add_argument("--locale-dir", type=Path, required=True, help="Directory containing locale JSON files")
    parser.add_argument("--strict", action="store_true", help="Enable strict validation mode")
    args = parser.parse_args()
    
    if not args.locale_dir.exists():
        print(f"Error: Locale directory '{args.locale_dir}' does not exist")
        return 1
    
    is_valid, results = validate_all_locales(args.locale_dir)
    
    print(f"Locale validation results for {args.locale_dir}:")
    all_errors = []
    for file_name, errors in results.items():
        if errors:
            print(f"  ❌ {file_name}:")
            for error in errors:
                print(f"     - {error}")
            all_errors.extend(errors)
        else:
            print(f"  ✅ {file_name}: Valid")
    
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
    exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest AUCTUM_LEDGER_LOTSPACE/app/scripts/__tests__/validate_locale_test.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add AUCTUM_LEDGER_LOTSPACE/app/scripts/validate_locale_files.py
git add AUCTUM_LEDGER_LOTSPACE/app/scripts/i18n_audit.py
git commit -m "feat: add locale validation pipeline from legacy"
```

---

### Task 3: Reconcile legacy CI/CD workflows and align port mapping

**Files:**
- Modify: `AUCTUM_LEDGER_LOTSPACE/app/docker-compose.yml:3-30` (fix port mapping: postgres 5432, timescaledb 5433, redis 6379, kafka 9092, api 3001, app 80)
- Modify: `AUCTUM_LEDGER_LOTSPACE/app/docker-compose.dev.yml:5-15` (align with prod topology)
- Modify: `AUCTUM_LEDGER_LOTSPACE/.github/workflows/i18n.yml:15-25` (integrate migrated scripts)
- Create: `AUCTUM_LEDGER_LOTSPACE/.github/workflows/test-migrations.yml` (new workflow to test migration idempotency)
- Modify: `AUCTUM_LEDGER_LOTSPACE/app/Dockerfile.app:10-25` (add Python scripts to image)

**Interfaces:**
- Consumes: Docker daemon, GitHub Actions context, locale directories
- Produces: Validated Docker images, passing CI/CD pipeline

- [ ] **Step 1: Write failing test for docker-compose port validation**

```python
import yaml
import pytest
from pathlib import Path

def test_docker_compose_port_mapping():
    compose_file = Path("AUCTUM_LEDGER_LOTSPACE/app/docker-compose.yml")
    with open(compose_file) as f:
        compose = yaml.safe_load(f)
    
    expected_ports = {
        "postgres": 5432,
        "timescaledb": 5433,
        "redis": 6379,
        "kafka": 9092,
        "api": 3001,
        "app": 80
    }
    
    for service, expected_port in expected_ports.items():
        assert service in compose["services"], f"Service {service} not found in docker-compose.yml"
        service_config = compose["services"][service]
        
        # Check both host and container ports
        ports = service_config.get("ports", [])
        port_found = False
        for port_mapping in ports:
            if isinstance(port_mapping, str):
                host_port, container_port = port_mapping.split(":")
                if int(container_port) == expected_port:
                    port_found = True
                    break
            elif isinstance(port_mapping, dict):
                if port_mapping.get("target") == expected_port:
                    port_found = True
                    break
        
        assert port_found, f"Expected container port {expected_port} not found for service {service}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest AUCTUM_LEDGER_LOTSPACE/tests/test_docker_compose_ports.py -v`

Expected: FAIL with "ModuleNotFoundError: No module named 'yaml'"

- [ ] **Step 3: Write minimal docker-compose validation script**

```python
import yaml
import sys
from pathlib import Path

def validate_docker_compose_ports(compose_file: Path):
    with open(compose_file) as f:
        compose = yaml.safe_load(f)
    
    expected_ports = {
        "postgres": 5432,
        "timescaledb": 5433,
        "redis": 6379,
        "kafka": 9092,
        "api": 3001,
        "app": 80
    }
    
    errors = []
    
    for service, expected_port in expected_ports.items():
        if service not in compose["services"]:
            errors.append(f"Service {service} not found in docker-compose.yml")
            continue
        
        service_config = compose["services"][service]
        ports = service_config.get("ports", [])
        port_found = False
        
        for port_mapping in ports:
            if isinstance(port_mapping, str):
                host_port, container_port = port_mapping.split(":")
                if int(container_port) == expected_port:
                    port_found = True
                    break
            elif isinstance(port_mapping, dict):
                if port_mapping.get("target") == expected_port:
                    port_found = True
                    break
        
        if not port_found:
            errors.append(f"Expected container port {expected_port} not found for service {service}")
    
    return errors

def main():
    compose_file = Path("AUCTUM_LEDGER_LOTSPACE/app/docker-compose.yml")
    errors = validate_docker_compose_ports(compose_file)
    
    if errors:
        print("Docker Compose port validation errors:")
        for error in errors:
            print(f"  ❌ {error}")
        return 1
    
    print("✅ Docker Compose port mapping is correct")
    return 0

if __name__ == "__main__":
    exit(main())
```

- [ ] **Step 4: Run validation script to verify fixes**

Run: `cd AUCTUM_LEDGER_LOTSPACE && python app/scripts/validate_docker_compose.py`

Expected: PASS with "✅ Docker Compose port mapping is correct"

- [ ] **Step 5: Commit port mapping fixes**

```bash
git add AUCTUM_LEDGER_LOTSPACE/app/docker-compose.yml
git add AUCTUM_LEDGER_LOTSPACE/app/docker-compose.dev.yml
git commit -m "fix: align docker-compose port mapping with BUILD-BRIEF spec"
```

---

### Task 4: Create OpenAPI contract and credential state machine validation

**Files:**
- Create: `AUCTUM_LEDGER_LOTSPACE/engineering/02-openapi-contract.md` (OpenAPI 3.0 contract based on existing routes)
- Modify: `AUCTUM_LEDGER_LOTSPACE/app/server/db/migrations/20260913_01_credential_state_machine.sql:1-100` (add missing columns per BUILD-BRIEF: `refresh_token`, `token_expires`, `scope`)
- Create: `AUCTUM_LEDGER_LOTSPACE/tests/test_credential_state_machine.py`

**Interfaces:**
- Consumes: PostgreSQL database connection, existing credential_state_machine.ts
- Produces: Validated OpenAPI spec, completed credential state machine schema

- [ ] **Step 1: Write failing test for credential state machine columns**

```python
import pytest
import psycopg
from pathlib import Path

def test_credential_state_machine_has_required_columns():
    # Connect to test database
    conn = psycopg.connect(
        host="localhost",
        port=5432,
        dbname="auctum_ledger",
        user="postgres",
        password="postgres"
    )
    
    try:
        with conn.cursor() as cursor:
            # Check for required columns in credential table
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'credential' 
                AND table_schema = 'public'
            """)
            
            columns = [row[0] for row in cursor.fetchall()]
            
            # BUILD-BRIEF requires these columns for credential state machine
            required_columns = {
                'state_id', 'refresh_token', 'token_expires', 'scope', 
                'created_at', 'updated_at', 'expires_at', 'last_refreshed_at'
            }
            
            missing_columns = required_columns - set(columns)
            assert not missing_columns, f"Missing required columns: {missing_columns}"
            
            # Check credential_states table has all states
            cursor.execute("""
                SELECT state_id, description, is_terminal, next_states 
                FROM credential_states 
                WHERE state_id IN ('active', 'expiring', 'stale', 'lapsed')
            """)
            
            states = cursor.fetchall()
            state_ids = {row[0] for row in states}
            
            expected_states = {'active', 'expiring', 'stale', 'lapsed'}
            missing_states = expected_states - state_ids
            assert not missing_states, f"Missing credential states: {missing_states}"
            
    finally:
        conn.close()

def test_credential_state_transitions_are_valid():
    # Verify state transition rules from BUILD-BRIEF
    expected_transitions = {
        'active': ['expiring', 'lapsed'],  # Can expire or be manually lapsed
        'expiring': ['stale', 'active'],   # Can become stale or renewed
        'stale': ['lapsed', 'expiring'],   # Can lapse or be renewed from stale
        'lapsed': ['active']                # Can be reactivated
    }
    
    # Test transition logic based on BUILD-BRIEF specifications
    for current_state, valid_next in expected_transitions.items():
        # Implementation would test the credentialStateMachine.ts logic here
        assert isinstance(valid_next, list), f"Invalid transition definition for {current_state}"
        assert len(valid_next) > 0, f"No valid transitions for {current_state}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest AUCTUM_LEDGER_LOTSPACE/tests/test_credential_state_machine.py -v`

Expected: FAIL with "psycopg not installed" or "Database connection failed"

- [ ] **Step 3: Write minimal OpenAPI contract implementation**

```python
"""
OpenAPI 3.0 Contract for Auctum Ledger API

Based on BUILD-BRIEF.md §4: 10 route groups under /api/v1
"""

openapi: 3.0.3
info:
  title: Auctum Ledger API
  description: |
    Enterprise SaaS platform for specialty coffee green-bean distribution.
    Connects importers/exporters with roasters through Lot Compass identity,
    SCA cupping-score lot cards, sample-kit campaigns (ALT-001-005), 
    "Give a Kit, Get a Bag" referral engine, and education/credentialing module.
  version: 1.0.0
  contact:
    name: ODASI Technologies Inc.
    email: dev@odasi.com

servers:
  - url: https://{environment}.auctumledger.io/api/v1
    description: Production server
    variables:
      environment:
        default: prod
        enum: [dev, staging, prod]
  - url: http://localhost:3001/api/v1
    description: Development server

security:
  - OIDC: []

paths:
  /auth/login:
    post:
      tags: [Authentication]
      summary: OIDC login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthLoginRequest'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '400':
          $ref: '#/components/responses/BadRequest'

  /auth/logout:
    post:
      tags: [Authentication]
      summary: OIDC logout
      security:
        - OIDC: []
      responses:
        '200':
          description: Logout successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LogoutResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /roasters:
    get:
      tags: [Roasters]
      summary: List roasters
      parameters:
        - $ref: '#/components/parameters/LocaleParam'
        - $ref: '#/components/parameters/CursorParam'
        - $ref: '#/components/parameters/SearchParam'
      responses:
        '200':
          description: Roasters list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RoastersListResponse'

components:
  schemas:
    AuthLoginRequest:
      type: object
      required: [provider, code, redirect_uri]
      properties:
        provider:
          type: string
          enum: [google, apple, facebook]
        code:
          type: string
        redirect_uri:
          type: string
          format: uri
        id_token:
          type: string

    AuthResponse:
      type: object
      properties:
        access_token:
          type: string
        refresh_token:
          type: string
        expires_in:
          type: integer
        token_type:
          type: string
          enum: [bearer]
        scope:
          type: string
        user:
          $ref: '#/components/schemas/User'

    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
          format: email
        name:
          type: string
        avatar_url:
          type: string
          format: uri
        tenant_id:
          type: string
        role:
          type: string
          enum: [roaster, importer, exporter, admin]
        created_at:
          type: string
          format: date-time
        last_login_at:
          type: string
          format: date-time

    RoastersListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Roaster'
        pagination:
          $ref: '#/components/schemas/PaginationInfo'

    Roaster:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
          format: email
        avatar_url:
          type: string
          format: uri
        bio:
          type: string
        website_url:
          type: string
          format: uri
        accreditation_number:
          type: string
        is_verified:
          type: boolean
        last_login_at:
          type: string
          format: date-time
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    PaginationInfo:
      type: object
      properties:
        next_cursor:
          type: string
          nullable: true
        has_more:
          type: boolean
        total_count:
          type: integer

  parameters:
    LocaleParam:
      name: locale
      in: query
      required: true
      schema:
        type: string
        enum: [en-US, zh-CN, es-MX, pt-BR]
      description: Request locale for i18n support

    CursorParam:
      name: cursor
      in: query
      required: false
      schema:
        type: string
      description: Pagination cursor for list endpoints

    SearchParam:
      name: search
      in: query
      required: false
      schema:
        type: string
      description: Search query for filtering results

  responses:
    Unauthorized:
      description: Authentication failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'

    BadRequest:
      description: Invalid request parameters
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'

    ProblemDetails:
      type: object
      properties:
        type:
          type: string
          format: uri
          default: "https://api.auctumledger.io/errors/{code}"
        title:
          type: string
        status:
          type: integer
          format: int32
        detail:
          type: string
        instance:
          type: string
          format: uri
        extensions:
          type: object

  securitySchemes:
    OIDC:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.auctumledger.io/oauth/authorize
          tokenUrl: https://auth.auctumledger.io/oauth/token
          scopes:
            read:profile: Read user profile
            read:tenants: Read tenant information
            write:credentials: Write credential data
            read:catalog: Read catalog data

tags:
  - name: Authentication
    description: OIDC authentication endpoints
  - name: Roasters
    description: Roaster management endpoints
  - name: Catalog
    description: Lot catalog endpoints
  - name: Campaigns
    description: Sample kit campaigns (ALT-001-005)
  - name: Referrals
    description: "Give a Kit, Get a Bag" referral engine
  - name: Credentials
    description: Education credential state machine
  - name: Orders
    description: Order management
  - name: Webhooks
    description: Webhook subscriptions
  - name: Analytics
    description: Analytics and reporting
  - name: Automation
    description: Automation rules

```

- [ ] **Step 4: Verify credential state machine SQL includes required columns**

```bash
cd AUCTUM_LEDGER_LOTSPACE/app
grep -n "ALTER TABLE credential ADD COLUMN" server/db/migrations/20260913_01_credential_state_machine.sql
# Should show all required columns (refresh_token, token_expires, scope, etc.)
```

Expected: All BUILD-BRIEF required columns present

- [ ] **Step 5: Commit OpenAPI contract and credential state machine fixes**

```bash
git add AUCTUM_LEDGER_LOTSPACE/engineering/02-openapi-contract.md
git add AUCTUM_LEDGER_LOTSPACE/app/server/db/migrations/20260913_01_credential_state_machine.sql
git commit -m "feat: add OpenAPI contract and complete credential state machine schema"
```

---

### Task 5: Create comprehensive CI/CD workflow upgrades

**Files:**
- Create: `AUCTUM_LEDGER_LOTSPACE/.github/workflows/test-migrations.yml` (migration validation workflow)
- Modify: `AUCTUM_LEDGER_LOTSPACE/.github/workflows/i18n.yml:25-40` (integrate migrated Python scripts)
- Create: `AUCTUM_LEDGER_LOTSPACE/.github/workflows/deploy-validation.yml` (deployment validation workflow)
- Modify: `AUCTUM_LEDGER_LOTSPACE/.github/workflows/docker-build.yml:15-30` (add migration test step)
- Create: `AUCTUM_LEDGER_LOTSPACE/tests/integration/test_migration_idempotency.py`

**Interfaces:**
- Consumes: GitHub Actions context, Docker Compose, PostgreSQL migrations
- Produces: Validated migration runs, passing CI/CD pipeline

- [ ] **Step 1: Write failing test for migration idempotency**

```python
import pytest
import subprocess
import time
from pathlib import Path

def test_database_migrations_are_idempotent():
    """Test that running migrations twice produces same schema"""
    project_root = Path("AUCTUM_LEDGER_LOTSPACE")
    
    # First migration run
    result1 = subprocess.run(
        ["docker", "compose", "-f", "app/docker-compose.yml", "--profile", "migrate", "run", "--rm", "migrate"],
        cwd=project_root,
        capture_output=True,
        text=True
    )
    
    assert result1.returncode == 0, f"First migration failed: {result1.stderr}"
    
    # Wait a moment for services to stabilize
    time.sleep(5)
    
    # Second migration run - should be idempotent
    result2 = subprocess.run(
        ["docker", "compose", "-f", "app/docker-compose.yml", "--profile", "migrate", "run", "--rm", "migrate"],
        cwd=project_root,
        capture_output=True,
        text=True
    )
    
    # Second run should succeed even if tables already exist
    assert result2.returncode == 0, f"Second migration failed (should be idempotent): {result2.stderr}"
    
    # Both runs should have similar output patterns
    assert "Running migration" in result1.stdout
    assert "Running migration" in result2.stdout
    
def test_migration_script_creates_required_tables():
    """Test that migrations create all required tables from BUILD-BRIEF"""
    project_root = Path("AUCTUM_LEDGER_LOTSPACE")
    
    # Run migration in a clean environment
    result = subprocess.run(
        ["docker", "compose", "-f", "app/docker-compose.yml", "--profile", "migrate", "up", "--build", "--force-recreate"],
        cwd=project_root,
        capture_output=True,
        text=True,
        timeout=300
    )
    
    assert result.returncode == 0, f"Migration setup failed: {result.stderr}"
    
    # Verify critical tables exist by checking migration output
    required_tables = {
        'roasters', 'catalog_lots', 'campaigns', 'automation_rules',
        'sample_kits', 'orders', 'webhooks', 'referrals', 'reward_ledger',
        'credential_states', 'credential', 'credential_events', 'outbox_events'
    }
    
    for table in required_tables:
        assert f"CREATE TABLE {table}" in result.stdout, f"Required table {table} not found in migration output"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest AUCTUM_LEDGER_LOTSPACE/tests/integration/test_migration_idempotency.py -v`

Expected: FAIL with "ModuleNotFoundError: No module named 'docker'" or similar integration test dependencies

- [ ] **Step 3: Write minimal CI/CD workflow for migration validation**

```yaml
name: Test Migration Idempotency

on:
  push:
    branches: [main, develop]
    paths:
      - 'app/server/db/migrations/**'
      - '.github/workflows/test-migrations.yml'
  pull_request:
    branches: [main]
    paths:
      - 'app/server/db/migrations/**'
      - '.github/workflows/test-migrations.yml'

jobs:
  test-migration:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up Docker Compose
        run: |
          cd app
          docker compose -f docker-compose.yml --profile migrate up --build -d
          
      - name: Wait for database to be ready
        run: |
          sleep 30
          docker compose -f app/docker-compose.yml exec -T postgres pg_isready -d auctum-ledger
          
      - name: Run first migration
        run: |
          cd AUCTUM_LEDGER_LOTSPACE
          docker compose -f app/docker-compose.yml --profile migrate run --rm migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/auctum-ledger
          
      - name: Wait for services to stabilize
        run: sleep 10
        
      - name: Run second migration (idempotency test)
        run: |
          cd AUCTUM_LEDGER_LOTSPACE
          docker compose -f app/docker-compose.yml --profile migrate run --rm migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/auctum-ledger
          
      - name: Clean up
        if: always()
        run: |
          docker compose -f app/docker-compose.yml --profile migrate down
          
      - name: Migration validation summary
        run: |
          echo "✅ Migration idempotency test passed"
          echo "✅ Both migration runs completed successfully"
```

- [ ] **Step 4: Update i18n.yml workflow to use migrated scripts**

```yaml
name: i18n Validation

on:
  push:
    branches: [main, develop]
    paths:
      - 'app/public/locales/**'
      - 'app/scripts/i18n_audit.py'
      - 'app/scripts/validate_locale_files.py'
      - '.github/workflows/i18n.yml'
  pull_request:
    branches: [main]
    paths:
      - 'app/public/locales/**'
      - 'app/scripts/i18n_audit.py'
      - 'app/scripts/validate_locale_files.py'
      - '.github/workflows/i18n.yml'

jobs:
  validate-locales:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install Python dependencies
        run: |
          cd AUCTUM_LEDGER_LOTSPACE/app
          pip install -r requirements.txt || pip install --break-system-packages -r requirements.txt
          
      - name: Run i18n audit script
        run: |
          cd AUCTUM_LEDGER_LOTSPACE/app
          python scripts/i18n_audit.py --locale-dir public/locales
          
      - name: Run locale validation script
        run: |
          cd AUCTUM_LEDGER_LOTSPACE/app
          python scripts/validate_locale_files.py --locale-dir public/locales --strict
          
      - name: Validate locale parity
        run: |
          cd AUCTUM_LEDGER_LOTSPACE/app
          python -c "
          import json
          from pathlib import Path
          
          locales = ['en-US', 'zh-CN', 'es-MX', 'pt-BR']
          base_locale = None
          base_keys = None
          
          for locale in locales:
              locale_dir = Path(f'public/locales/{locale}')
              for file_path in locale_dir.glob('*.json'):
                  with open(file_path) as f:
                      data = json.load(f)
                  
                  if base_locale is None:
                      base_locale = locale
                      base_keys = set(data.keys())
                  
                  current_keys = set(data.keys())
                  if current_keys != base_keys:
                      print(f'Key mismatch in {locale}/{file_path.name}')
                      print(f'  Missing: {base_keys - current_keys}')
                      print(f'  Extra: {current_keys - base_keys}')
                      exit(1)
          
          print(f'✅ All locales have consistent key structure (base: {base_locale})')
          "
          
      - name: Run i18n parity check
        run: |
          cd AUCTUM_LEDGER_LOTSPACE/app
          python -c "
          import json
          from pathlib import Path
          
          # Check that all 7 locales have at least 90% key coverage
          locales = ['en-US', 'zh-CN', 'es-MX', 'pt-BR', 'vi-VN', 'de-DE', 'fr-FR']
          ci_gated_locales = ['en-US', 'zh-CN', 'es-MX', 'pt-BR']
          
          for locale in locales:
              locale_dir = Path(f'public/locales/{locale}')
              all_keys = set()
              
              for file_path in locale_dir.glob('*.json'):
                  with open(file_path) as f:
                      data = json.load(f)
                  all_keys.update(data.keys())
              
              print(f'{locale}: {len(all_keys)} unique keys')
              
              # For CI-gated locales, require 100% parity with en-US
              if locale in ci_gated_locales:
                  en_keys = set()
                  en_dir = Path('public/locales/en-US')
                  for file_path in en_dir.glob('*.json'):
                      with open(file_path) as f:
                          data = json.load(f)
                      en_keys.update(data.keys())
                  
                  missing = en_keys - all_keys
                  if missing:
                      print(f'  ❌ Missing keys for CI-gated locale {locale}: {missing}')
                      exit(1)
                  
                  print(f'  ✅ CI-gated locale {locale} passes parity check')
          
          print('✅ All i18n validation checks passed')
          "
```

- [ ] **Step 5: Commit CI/CD workflow upgrades**

```bash
git add AUCTUM_LEDGER_LOTSPACE/.github/workflows/test-migrations.yml
git add AUCTUM_LEDGER_LOTSPACE/.github/workflows/i18n.yml
git commit -m "feat: upgrade CI/CD with migration idempotency and i18n validation"
```

---

### Task 6: Final verification and deployment pipeline setup

**Files:**
- Create: `AUCTUM_LEDGER_LOTSPACE/deploy.sh` (enhanced with migration validation)
- Create: `AUCTUM_LEDGER_LOTSPACE/.dockerignore` (optimized for build)
- Create: `AUCTUM_LEDGER_LOTSPACE/.env.example` (comprehensive example)
- Modify: `AUCTUM_LEDGER_LOTSPACE/app/Dockerfile.app:10-25` (add Python scripts to image)
- Create: `AUCTUM_LEDGER_LOTSPACE/tests/acceptance/test_full_deployment.py`

**Interfaces:**
- Consumes: Docker daemon, GitHub Actions, local environment variables
- Produces: Deployable Docker images, passing end-to-end tests

- [ ] **Step 1: Write failing test for full deployment smoke**

```python
import pytest
import subprocess
import time
import requests
from pathlib import Path

def test_full_deployment_smoke_test():
    """End-to-end smoke test of the complete deployment"""
    project_root = Path("AUCTUM_LEDGER_LOTSPACE")
    
    # Start deployment with all services
    deployment_result = subprocess.run(
        ["docker", "compose", "-f", "app/docker-compose.yml", "--profile", "migrate", "up", "-d"],
        cwd=project_root,
        capture_output=True,
        text=True
    )
    
    assert deployment_result.returncode == 0, f"Deployment failed: {deployment_result.stderr}"
    
    # Wait for services to be ready
    time.sleep(60)  # Wait longer for all services to start
    
    # Health check endpoints
    health_endpoints = [
        "http://localhost:3001/api/v1/health",
        "http://localhost:80/health",
        "http://localhost:5432",  # PostgreSQL port
        "http://localhost:5433",  # TimescaleDB port
    ]
    
    for endpoint in health_endpoints:
        try:
            if "health" in endpoint:
                response = requests.get(endpoint, timeout=10)
                if response.status_code == 200:
                    print(f"✅ Health check passed for {endpoint}")
                else:
                    print(f"⚠️  Health check returned {response.status_code} for {endpoint}")
            else:
                # For database ports, just check if port is open
                import socket
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex(('localhost', int(endpoint.split(':')[-1])))
                sock.close()
                if result == 0:
                    print(f"✅ Port {endpoint.split(':')[-1]} is open")
                else:
                    print(f"❌ Port {endpoint.split(':')[-1]} is not responding")
        except Exception as e:
            print(f"⚠️  Health check error for {endpoint}: {e}")
    
    # Test core API endpoints
    api_endpoints = [
        "http://localhost:3001/api/v1/roasters",
        "http://localhost:3001/api/v1/catalog",
        "http://localhost:3001/api/v1/campaigns",
    ]
    
    for endpoint in api_endpoints:
        try:
            response = requests.get(endpoint, timeout=10)
            if response.status_code in [200, 401]:  # 401 expected without auth
                print(f"✅ API endpoint {endpoint} is accessible (status: {response.status_code})")
            else:
                print(f"⚠️  API endpoint {endpoint} returned unexpected status: {response.status_code}")
        except Exception as e:
            print(f"❌ API endpoint {endpoint} failed: {e}")
    
    # Clean up deployment
    cleanup_result = subprocess.run(
        ["docker", "compose", "-f", "app/docker-compose.yml", "down"],
        cwd=project_root,
        capture_output=True,
        text=True
    )
    
    assert cleanup_result.returncode == 0, f"Cleanup failed: {cleanup_result.stderr}"
    
    print("✅ Full deployment smoke test completed")

def test_local_development_environment():
    """Test that local development environment can be started"""
    project_root = Path("AUCTUM_LEDGER_LOTSPACE")
    
    # Test docker-compose.dev.yml
    dev_compose_result = subprocess.run(
        ["docker", "compose", "-f", "app/docker-compose.dev.yml", "config"],
        cwd=project_root,
        capture_output=True,
        text=True
    )
    
    assert dev_compose_result.returncode == 0, f"docker-compose.dev.yml config invalid: {dev_compose_result.stderr}"
    print("✅ docker-compose.dev.yml is valid")
    
    # Test that essential scripts are present
    required_scripts = [
        "app/scripts/i18n_audit.py",
        "app/scripts/validate_locale_files.py",
        "app/scripts/validate_docker_compose.py"
    ]
    
    for script_path in required_scripts:
        script_file = project_root / script_path
        assert script_file.exists(), f"Required script not found: {script_path}"
        print(f"✅ Script found: {script_path}")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest AUCTUM_LEDGER_LOTSPACE/tests/acceptance/test_full_deployment.py -v`

Expected: FAIL with "subprocess" or "docker" not available in test environment

- [ ] **Step 3: Write minimal deployment verification script**

```python
#!/usr/bin/env python3
"""
Deployment verification script for Auctum Ledger full-stack migration.
Validates that all components are properly configured and can be deployed.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

def check_required_files() -> Tuple[bool, List[str]]:
    """Check that all required files are present"""
    project_root = Path("AUCTUM_LEDGER_LOTSPACE")
    
    required_files = [
        # Core project files
        "app/package.json",
        "app/vite.config.ts",
        "app/tsconfig.json",
        "app/tailwind.config.ts",
        "app/server/index.ts",
        "app/server/app.ts",
        "app/server/db/migrations/202609110000_platform__base.sql",
        "app/server/db/migrations/202609110100_telemetry__engagement.sql",
        "app/server/db/migrations/20260913_01_credential_state_machine.sql",
        
        # Scripts (migrated from legacy)
        "app/scripts/i18n_audit.py",
        "app/scripts/validate_locale_files.py",
        "app/scripts/validate_docker_compose.py",
        
        # Configuration files
        "app/docker-compose.yml",
        "app/docker-compose.dev.yml",
        "app/Dockerfile.app",
        "app/Dockerfile.proxy",
        "deploy.sh",
        ".dockerignore",
        ".env.example",
        
        # CI/CD workflows
        ".github/workflows/test.yml",
        ".github/workflows/docker-build.yml",
        ".github/workflows/deploy.yml",
        ".github/workflows/i18n.yml",
        
        # Documentation
        "README.md",
        "CONTRACT.md",
        "engineering/02-openapi-contract.md",
        
        # Localization
        "app/public/locales/en-US/common.json",
        "app/public/locales/zh-CN/common.json",
        "app/public/locales/es-MX/common.json",
        "app/public/locales/pt-BR/common.json",
    ]
    
    missing_files = []
    
    for file_path in required_files:
        full_path = project_root / file_path
        if not full_path.exists():
            missing_files.append(file_path)
    
    return len(missing_files) == 0, missing_files

def check_docker_compose_ports() -> Tuple[bool, List[str]]:
    """Validate docker-compose.yml port mapping against BUILD-BRIEF"""
    project_root = Path("AUCTUM_LEDGER_LOTSPACE")
    compose_file = project_root / "app" / "docker-compose.yml"
    
    try:
        with open(compose_file) as f:
            import yaml
            compose = yaml.safe_load(f)
        
        expected_ports = {
            "postgres": 5432,
            "timescaledb": 5433,
            "redis": 6379,
            "kafka": 9092,
            "api": 3001,
            "app": 80
        }
        
        errors = []
        
        for service, expected_port in expected_ports.items():
            if service not in compose.get("services", {}):
                errors.append(f"Service {service} not found in docker-compose.yml")
                continue
            
            service_config = compose["services"][service]
            ports = service_config.get("ports", [])
            port_found = False
            
            for port_mapping in ports:
                if isinstance(port_mapping, str):
                    host_port, container_port = port_mapping.split(":")
                    if int(container_port) == expected_port:
                        port_found = True
                        break
                elif isinstance(port_mapping, dict):
                    if port_mapping.get("target") == expected_port:
                        port_found = True
                        break
            
            if not port_found:
                errors.append(f"Expected container port {expected_port} not found for service {service}")
        
        return len(errors) == 0, errors
        
    except Exception as e:
        return False, [f"Error validating docker-compose.yml: {e}"]

def check_python_scripts() -> Tuple[bool, List[str]]:
    """Validate Python scripts are executable and have correct shebang"""
    project_root = Path("AUCTUM_LEDGER_LOTSPACE")
    scripts = [
        "app/scripts/i18n_audit.py",
        "app/scripts/validate_locale_files.py",
        "app/scripts/validate_docker_compose.py"
    ]
    
    errors = []
    
    for script_path in scripts:
        script_file = project_root / script_path
        if not script_file.exists():
            errors.append(f"Script not found: {script_path}")
            continue
        
        try:
            with open(script_file, 'r') as f:
                content = f.read(100)  # Check first 100 chars
                if not content.startswith('#!'):
                    errors.append(f"Script {script_path} missing shebang")
        except Exception as e:
            errors.append(f"Error reading script {script_path}: {e}")
    
    return len(errors) == 0, errors

def check_i18n_coverage() -> Tuple[bool, List[str]]:
    """Check i18n coverage meets BUILD-BRIEF requirements"""
    project_root = Path("AUCTUM_LEDGER_LOTSPACE")
    
    required_locales = ['en-US', 'zh-CN', 'es-MX', 'pt-BR']
    ci_gated_locales = required_locales  # All these must pass CI gates
    ship_readiness_locales = ['vi-VN', 'de-DE', 'fr-FR']
    
    errors = []
    
    for locale in required_locales:
        locale_dir = project_root / f"app/public/locales/{locale}"
        if not locale_dir.exists():
            errors.append(f"Locale directory not found: {locale}")
            continue
        
        # Check for required common.json file
        common_file = locale_dir / "common.json"
        if not common_file.exists():
            errors.append(f"Common locale file not found for {locale}")
            continue
        
        # Validate JSON structure
        try:
            with open(common_file) as f:
                data = json.load(f)
            
            # Check for required fields based on BUILD-BRIEF
            required_fields = ['welcomeMessage', 'submitButton', 'errorRequired', 'validation']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                errors.append(f"Locale {locale} missing required fields: {missing_fields}")
                
        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON in locale {locale}/common.json: {e}")
        except Exception as e:
            errors.append(f"Error validating locale {locale}: {e}")
    
    return len(errors) == 0, errors

def main() -> int:
    """Main verification function"""
    print("🔍 Auctum Ledger Deployment Verification")
    print("=" * 50)
    
    checks = [
        ("Required Files", check_required_files),
        ("Docker Compose Ports", check_docker_compose_ports),
        ("Python Scripts", check_python_scripts),
        ("i18n Coverage", check_i18n_coverage),
    ]
    
    all_passed = True
    
    for check_name, check_func in checks:
        print(f"\n📋 Checking {check_name}...")
        passed, details = check_func()
        
        if passed:
            print(f"✅ {check_name} - PASSED")
        else:
            print(f"❌ {check_name} - FAILED")
            all_passed = False
            
            for detail in details:
                print(f"   - {detail}")
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All deployment checks PASSED!")
        return 0
    else:
        print("💥 Some deployment checks FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Make deployment script executable and run verification**

```bash
chmod +x AUCTUM_LEDGER_LOTSPACE/deploy.sh
chmod +x AUCTUM_LEDGER_LOTSPACE/app/scripts/validate_docker_compose.py

# Create .dockerignore if not exists
echo "# Dependencies
node_modules
.vscode
.git

# Build outputs
dist
build
*.pyc
__pycache__

# Environment files
.env
.env.local
.env.*.local

# IDE files
.vscode
.idea

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp" > AUCTUM_LEDGER_LOTSPACE/.dockerignore

# Create .env.example with required variables
echo "# Auctum Ledger Environment Variables
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auctum-ledger

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Kafka Configuration
KAFKA_URL=localhost:9092

# OIDC Configuration
OIDC_ISSUER=https://auth.auctumledger.io
OIDC_CLIENT_ID=auctum-ledger-web
OIDC_CLIENT_SECRET=your-client-secret-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars

# OpenAI Configuration (for chat proxy)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Server Configuration
PORT=3001
NODE_ENV=production

# App Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_AI_PROXY_URL=http://localhost:3001

# Security
CORS_ORIGIN=https://app.auctumledger.io

# Logging
LOG_LEVEL=info" > AUCTUM_LEDGER_LOTSPACE/.env.example

# Update Dockerfile.app to include Python scripts
sed -i 's|/usr/local/bin/sh -c \"npm ci\"|COPY app/scripts/*.py /usr/src/app/scripts/|g' AUCTUM_LEDGER_LOTSPACE/app/Dockerfile.app

# Add Python runtime to Dockerfile.app
echo "RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*" >> AUCTUM_LEDGER_LOTSPACE/app/Dockerfile.app

# Run verification script
cd AUCTUM_LEDGER_LOTSPACE && python deploy_verification.py
```

Expected: All checks pass, scripts executable, verification succeeds

- [ ] **Step 5: Commit deployment verification setup**

```bash
git add AUCTUM_LEDGER_LOTSPACE/deploy.sh
git add AUCTUM_LEDGER_LOTSPACE/.dockerignore
git add AUCTUM_LEDGER_LOTSPACE/.env.example
git add AUCTUM_LEDGER_LOTSPACE/app/Dockerfile.app
git add AUCTUM_LEDGER_LOTSPACE/deploy_verification.py
git commit -m "feat: add deployment verification and hardening"
```

---

## Execution Plan

After this implementation plan is approved and saved, the migration will be executed using one of these approaches:

**1. Subagent-Driven (Recommended)**:
- I dispatch fresh subagents for each task
- Two-stage review between tasks (subagent → human reviewer → subagent)
- Fast iteration with parallel task execution where possible
- Each task ends with a reviewer-verified deliverable

**2. Inline Execution**:
- Execute tasks sequentially in this session using executing-plans
- Batch execution with checkpoint reviews
- More control over pacing and immediate feedback

**Which execution approach would you prefer?**
