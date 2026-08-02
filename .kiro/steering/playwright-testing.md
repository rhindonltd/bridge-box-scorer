# Playwright Testing Guidelines

## Test structure

- All test files go in `tests/` directory
- Use `test.describe` for grouping related tests
- Name files as `<feature>.spec.ts`

## Locators

- Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
- Never use XPath unless absolutely necessary
- Use `data-testid` attributes only as a fallback

## Assertions

- Use web-first assertions (`toBeVisible`, `toHaveText`)
- Avoid `waitForTimeout`. Use `waitForLoadState` or auto-waiting instead

## Fixtures

- Import shared fixtures from `tests/fixtures/`
- Use `test.extend` for custom page objects
