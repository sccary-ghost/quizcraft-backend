# QuizCraft Testing Strategy

QuizCraft emphasizes test-driven methodologies to ensure stability across Phase 20 updates.

## 1. Testing Frameworks
- **Unit & Integration Tests:** `Jest` along with `ts-jest` for TypeScript support.
- **API Testing:** `Supertest` is used to simulate HTTP requests to Express endpoints without listening on a network port.
- **E2E Testing:** Handled by the Next.js frontend repository using `Cypress` or `Playwright`.

## 2. Directory Structure
Tests are located inside the `tests/` directory, mirroring the `src/` directory structure:
- `tests/unit/`: Tests for isolated services, utility functions, and domain logic.
- `tests/integration/`: Tests for API routes and database interactions.

## 3. Mocking & Test Database
- **Unit Tests:** External dependencies (Prisma, Redis, AI APIs) are aggressively mocked using `jest.mock`.
- **Integration Tests:** We use a dedicated test database container. Before running integration tests, a setup script drops the schema, runs Prisma migrations, and seeds test data.

## 4. Running Tests
- Run all tests: `npm test`
- Run only unit tests: `npm run test:unit`
- Run only integration tests: `npm run test:integration`
- Generate coverage report: `npm run test:cov` (Target coverage: >80%)

## 5. CI Test Execution
Tests automatically run in GitHub Actions on every Pull Request.
The CI environment spins up a temporary PostgreSQL service container to execute integration tests reliably. Pull requests will be blocked from merging if any tests fail or if test coverage drops below the required threshold.

## 6. Writing Tests
- Use the **Arrange, Act, Assert** pattern.
- Ensure state is cleaned up after integration tests to avoid test cross-contamination. Use `afterEach` or `afterAll` hooks to truncate database tables.
