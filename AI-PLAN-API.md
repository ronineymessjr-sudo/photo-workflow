# Bring your own AI: photography plan API

## Scope

This is text planning, NOT image generation. It does not need the user's local
Director. Existing Director and template routes remain available but do not
silently replace a failed BYOK request. AI drafts still need human review.

## Website

Settings > 接入自己的 AI. Select a provider, enter its model ID and API key, read
and confirm the destination/fee notice, then select 本次使用此模型. Next, create
a plan through the normal form. Enable alone performs no billable request.
Model IDs must be supplied from the provider's current model list.

The key lives only in page memory until disconnect/reload, not browser storage,
exports, workspace sync or a database. The password field is cleared immediately
after activation. Each generation sends the key and brief to Photo Workflow's
HTTPS backend, which forwards them to the selected provider. The provider may
charge the caller. Existing page scripts can access in-memory data, so this is
not a client-side secret vault. Use a restricted, low-budget provider key.

## HTTP

`GET /api/ai/providers` returns public provider IDs and exact destinations.

`POST /api/ai/plan`, `Content-Type: application/json`:

```json
{
  "provider": "deepseek",
  "model": "MODEL_ID_FROM_PROVIDER",
  "apiKey": "CALLER_KEY_NOT_A_SITE_SECRET",
  "input": {
    "theme": "雨夜城市纪实",
    "scene": "斑马线",
    "modelDesc": "成年人物",
    "duration": "2小时",
    "people": "1",
    "extra": "高机位俯拍，人物左下角，完整全身"
  }
}
```

No app login required; callers supply their own provider key. No server-owned
paid key is used. Calls return existing `title/input/sections/shotList/director`
plan format, with `director.source=byok-ai-plan` and provider/model provenance.
Only the eight brief fields used by the existing compiler are sent upstream;
no entire photo library, account data or local files are sent.

Errors: 400 invalid config/brief/JSON; 413 >16KB body; 415 wrong content type;
422 provider key/model permission; 429 quota/rate limit; 502 provider/network or
invalid model output. Errors never include the provider's raw response body.
No retry loop, template fallback or automatic image calls.

## Provider destinations and validation

- OpenAI: https://api.openai.com/v1/chat/completions
- DeepSeek: https://api.deepseek.com/chat/completions
- Administrator can add HTTPS domain origins through comma-separated Worker
  `AI_PLAN_ALLOWED_ORIGINS`. Custom services use `/v1/chat/completions`, must
  support JSON mode, and require an explicit trusted-domain review first.
  No browser-supplied destination URLs and no redirects are followed.

Output must contain exactly the requested 9-16 unique shots with complete
execution fields, valid shot sizes/angles and a normal completion stop. This
validates structure, not visual beauty or guaranteed compliance with every
natural-language constraint. No padding of missing shots.

## Verification and release gate

`node --test tests/ai-plan.test.mjs` uses mocks only; no provider charge.
Real provider billing/latency/quality remain unverified until the user submits
a real request using their own key in the website. Never claim mock tests as a
real model result. Deploy Worker and curated website assets together; include
`assets/own-ai.js`. Rollback website disables the optional entry without
touching existing saved plans.

Official contracts: https://api-docs.deepseek.com/ and
https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat
