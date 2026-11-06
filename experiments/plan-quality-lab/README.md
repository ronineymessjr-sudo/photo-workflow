# Plan quality comparison lab

This is an isolated local experiment. It neither changes the production plan route nor calls a real AI provider.

Run `npm install`, `npm test`, `npm run test:eval`, then `npm start` in this directory. Open `http://127.0.0.1:8128/`.

The six fixed cases compare the existing `handleAiPlan` acceptance path with Ajv 8 JSON Schema validation. The TypeChat 0.1.4 test supplies a simulated first model response and, when validation fails, a simulated corrected second response. It measures whether repair is requested, **not** whether a real model would repair the plan. Promptfoo runs the same six cases through a local fixed-output provider; this is a regression-runner check, not a real-provider quality evaluation.

Observed results:

| Scenario | Ajv | Existing handler |
| --- | --- | --- |
| Valid nine shots | Pass | Pass |
| Missing action | Reject | Reject |
| Invalid angle code | Reject | Reject |
| Wrong framing/angle despite valid fields | Pass | Reject |
| Duplicate shot name | Pass | Reject |
| Unprovided umbrella | Pass | Reject |

TypeChat makes two calls for a missing field (one simulated repair), but only one for a semantically wrong shot because schema validation passes. That is why neither Ajv nor TypeChat alone can replace photographic-domain checks. A model/provider comparison still requires a separately authorized real-model test; this lab makes no claim about visual quality or shooting usefulness.

On 2026-10-26, `npm test` passed 1/1, `npm run test:eval` passed 6/6 using the local fixed-output provider, and the existing `node --test tests/ai-plan.test.mjs` passed 17/17. No real model was called. Promptfoo is only a development dependency in this experiment; it has a substantially larger dependency tree than the other two packages.
