# 08 — Testing

> Read this before writing any test. It defines what to test, how to structure tests,
> what to mock, and what the non-negotiable coverage requirements are.

---

## What must be tested (non-negotiable)

Every money path in the PM service requires tests. No exceptions:

| Path | Test file |
|---|---|
| Lease activation → charge generation | `pm/tests/services/test_charge_service.py` |
| Payment recording → charge status update | `pm/tests/services/test_payment_service.py` |
| Partial payment → `partial` status + balance | `pm/tests/services/test_payment_service.py` |
| Overdue logic (past due_date, unpaid) | `pm/tests/services/test_charge_service.py` |
| Receipt PDF generation + R2 upload | `pm/tests/services/test_payment_service.py` |
| Owner statement reconciliation | `pm/tests/services/test_statement_service.py` |
| Tenant portal — own-data isolation | `pm/tests/api/test_portal.py` |
| JWT auth — missing/expired/invalid token → 401 | `pm/tests/api/test_leases.py` (and others) |

Permission tests (a tenant cannot see another tenant's data) are treated as **critical** —
a failing permission test is a security bug, not just a test failure.

---

## PM testing stack

- **pytest** + **pytest-asyncio** for async FastAPI routes.
- **httpx.AsyncClient** for API-level tests (tests the full request/response cycle).
- **SQLAlchemy** with a **test Postgres database** — use a separate `pm_test` DB, not
  the application DB. Never mock the database for money-path tests; use real SQL.
- Factory helpers in `pm/tests/conftest.py` for creating owners, units, tenants, leases.

### Database setup
```python
# pm/tests/conftest.py pattern
@pytest.fixture(scope="session")
async def test_db():
    # Create all pm schema tables in pm_test DB
    # Yield engine
    # Drop all tables after session

@pytest.fixture(autouse=True)
async def rollback_after_test(test_db):
    # Wrap each test in a transaction and roll back
    # Keeps tests isolated without recreating the schema each time
```

### Mocking JWT auth in tests
```python
# Override the auth dependency for tests that don't test auth itself
@pytest.fixture
def admin_token_headers():
    # Return headers with a valid test JWT signed with DIRECTUS_SECRET
    # Set role=admin, user_id=test-uuid

@pytest.fixture
def tenant_token_headers(test_tenant):
    # Return headers with a valid test JWT for a specific tenant
```

### Mocking R2 in tests
Mock `pm/app/services/r2_service.py` at the service layer — do not make real R2 calls
in tests. Use `unittest.mock.AsyncMock` or `pytest-mock`.

```python
@pytest.fixture
def mock_r2(mocker):
    return mocker.patch("app.services.r2_service.upload_file", return_value="test-key")
```

### Mocking email in tests
Mock `worker/email/sender.py` — never send real emails in tests.

---

## Web (Next.js) testing

- **Vitest** for unit tests on utility functions (`currency.ts`, `slugify.ts`, i18n helpers).
- **Playwright** for end-to-end tests on critical user flows (search, listing detail, inquiry form).
- Do not test Directus internals from the web layer — mock the Directus client.

### What to test in web
| Area | Type |
|---|---|
| `currency.ts` — display formatting | Unit (Vitest) |
| `slugify.ts` | Unit (Vitest) |
| Search query param serialization/deserialization | Unit (Vitest) |
| Inquiry form submission → API route | Integration (Vitest + msw) |
| Listing detail page renders price correctly | Unit (Vitest + React Testing Library) |
| Search → results → detail navigation | E2E (Playwright) |

### What NOT to test in web
- Directus schema or data — that is tested at the data layer.
- MapLibre rendering — trust the library.
- Caddy/TLS — infrastructure concern.

---

## Worker testing

- **pytest** for job logic.
- Mock the Directus API client — do not make real HTTP calls in tests.
- Mock the email sender.
- Test the matching logic for saved searches with known fixture data.

### What to test in worker
| Area | File |
|---|---|
| Saved search criteria matching (filter logic) | `worker/tests/test_saved_search_alerts.py` |
| `last_notified_at` deduplication logic | `worker/tests/test_saved_search_alerts.py` |
| Rent reminder — correct tenants selected | `worker/tests/test_rent_reminders.py` |
| Rent reminder — not sent for paid charges | `worker/tests/test_rent_reminders.py` |

---

## Running tests

```bash
# PM tests
cd pm
pytest                        # all tests
pytest tests/services/        # services only
pytest -k "test_charge"       # specific test

# Web unit tests
cd web
pnpm test                     # Vitest

# Web E2E (requires running dev stack)
cd web
pnpm test:e2e                 # Playwright

# Worker tests
cd worker
pytest
```

---

## CI (future)
When CI is added, the minimum pipeline should:
1. Run `pm` pytest suite against a test Postgres.
2. Run `web` Vitest suite.
3. Run `worker` pytest suite.
4. Fail the build if any money-path or permission test fails.
