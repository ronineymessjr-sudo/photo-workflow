# Resend email login

## Current activation gate

Email login is OFF by default (`RESEND_AUTH_ENABLED=false`). Password login and
the isolated browser-only guest experience remain available. A Resend account
alone is not enough: the account checked on 2026-10-25 has no verified domains.
Cloudflare Pages' shared `pages.dev` address cannot be used as an owned sender
domain. No production email delivery or end-to-end OTP login is claimed yet.

## Configuration, in order

1. Use a domain whose DNS you control. Add a dedicated sending subdomain in
   Resend and publish the exact DNS records it supplies. Wait for verification.
2. In Supabase Auth custom SMTP, configure `smtp.resend.com`, port `465`, user
   `resend`, and the Resend sending key as SMTP password. Use a verified sender
   address and the sender name Photo Workflow. The user enters the secret in
   that dashboard; never put it in source, browser storage, screenshots or chat.
3. Set the Supabase Magic Link template to display `{{ .Token }}` (numeric OTP).
   Review both new-user confirmation and existing-user login email behavior.
   Check project-wide impacts before changing shared authentication settings.
4. Run tests, then enable Worker `RESEND_AUTH_ENABLED=true` only after SMTP and
   template setup is complete. Frontend discovers readiness through
   `GET /api/auth/methods`; when off/unavailable it retains password login.
5. Use a user-controlled real mailbox to test send, wrong/expired code, correct
   code, reload, logout, existing account data and a second isolated account.
   Confirm delivery to a non-owner mailbox before public release. Do not use
   Resend's restricted onboarding sender as a production workaround.

## Contract

- `POST /api/auth/email/send`: `{email}`. Success means sent, NOT logged in.
- `POST /api/auth/email/verify`: `{email,code}`. Supabase validates the code;
  the server maps the verified email to the existing public.users id and issues
  the existing application session. No client-supplied user id is trusted.
- No direct browser access to service keys. No schema changes. No guest token.
- Code resend UI waits 60 seconds; Supabase enforces server-side rate limits.
- Rollback: set `RESEND_AUTH_ENABLED=false`. Password and guest paths remain.

## Official setup references

- https://resend.com/docs/send-with-supabase-smtp
- https://supabase.com/docs/guides/auth/auth-email-passwordless
