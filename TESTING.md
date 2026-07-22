# Testing PhotoAtelier V2.5

## Release gate

```bash
npm ci
npm run test:release
```

This runs syntax checks, 68 Node/integration tests, static smoke checks, all three distribution builds, distribution validation, size budget validation and public-file security scanning.

## Browser E2E

```bash
npm run test:e2e
```

Requires a locally accessible Chrome/Chromium. Set `CHROME_PATH` when automatic discovery does not find the browser.

The current sandbox blocks Chromium from opening localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`; use a normal workstation or GitHub Actions for this gate.

## External integration

Follow `EXTERNAL-INTEGRATION-TASKS-V2.5.md`. Mock responses do not count as production verification.
