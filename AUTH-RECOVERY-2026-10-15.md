# Account authentication recovery

Scope: production web authentication and its telemetry. Keep legacy user IDs, password verification and stored user data intact. No database grants or RLS policies are loosened.

## Root causes

- The Worker queried private database tables using the anonymous key. The database correctly denied this with 42501.
- The existing environment template already defined a server-only SUPABASE_SERVICE_KEY, but the Worker and deployment workflow ignored it.
- The browser converted failed cloud logins into a mock local login and stored local-token. A prior failed login could therefore stay in local mode even on production.
- Successful sign-in from guest mode did not switch its captured storage mode to authenticated server storage.

## Fixes

- Private backend database queries require SUPABASE_SERVICE_KEY and never fall back to anonymous credentials.
- Support HTTPS project URLs and hostname-only configuration, plus modern secret keys and legacy service_role keys.
- Preserve ownership filters on private reads and deletes. Encode delete identifiers instead of allowing query parameter injection.
- Restrict local mode to loopback. Discard mock login sessions on non-loopback hosts without deleting plans or schedules.
- Authentication errors remain errors. Explicit guest usage remains available; it is not reported as successful login.
- Successful cloud login switches guest storage flags immediately.
- CI requires and uploads the backend-only secret. It must never be committed or included in frontend assets.

## Release gates

- Unit and integration regressions must pass, including no fake login, no anonymous user-table access, no leaked password/hash/credentials and retained owner filters.
- Configure the existing project's service key in the existing Worker and repository encrypted secrets using the owner's authenticated management access. Do not ask for secrets in chat.
- Run a clearly synthetic account registration, subsequent real sign-in and wrong-password rejection against the deployed API.
- Verify the deployed browser shows a real account session rather than local-token, then logout and verify private API access is denied.
- Verify sanitized success events in Workers Logs and distinguish synthetic tests from visitors.

Google separately confirmed live fetch success for the sitemap on 2026-10-15 at 20:55 Beijing time. The sitemap processing report and homepage indexing quota are external Google processing states, not proof of a currently unreachable file. Do not promise an indexing time or submit the XML itself for indexing.
