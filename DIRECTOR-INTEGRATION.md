# Director plan integration

Based on GitHub `ronineymessjr-sudo/photo-workflow` master `2e4fabc`, not the older V5 checkout.

## Run locally

Keep the existing Director service running on `http://127.0.0.1:8004`.

For Director v0.28.0, apply the versioned files in `director-overlay-v0.28.0/` before starting the service. The overlay is the tested backend half of the dynamic 9-16 shot workflow; its README contains hashes and the targeted test command.
Run `node tools/serve-director.mjs` from this checkout and open `http://127.0.0.1:8125/`.
The photography application's existing login remains required. No credentials were copied into this repository.

The existing form now calls `generateDirectorPlan` → `POST /api/director/plan` → Director `/v1/photoatelier/shoot-plan`.
The plan detail also exposes a single-shot candidate flow: choose a returned shot, click “生成一张候选图”, then `generateDirectorCandidate` → local `POST /api/director/generate-candidate` → Director `/v1/photoatelier/external-generate`.

The bridge requests 9-16 distinct shots according to duration, people, scene transitions, and delivery complexity. It does not copy upstream shots to fill a target. The plan page shows the shot overview first, then per-shot instructions; candidate generation always uses the explicitly selected shot.
The Director also exposes `POST /v1/photoatelier/identity-lock-workflow`, which builds a non-submitted identity-lock workflow blueprint. It accepts an authorized local identity reference, optional scene anchor, pose-control choice, aspect ratio, candidate count, and bounded retry count. It never downloads weights or calls a provider; the response remains blocked until a supported image-conditioning backend and human review are available.
Current input fields are sent without silently truncating them (over 2000 characters is rejected).
The stored `shotList` comes from that response, including photographer/model positions, cropping and rejection rules.
Director failures do not fall back to the legacy `genPlan`/shot templates.
Each plan records its request ID, submitted brief and review requirement.

## Boundaries

- This integrates planning, not image-weight training. The existing Director planner remains retrieval/rule-based.
- Three candidate shots are returned, not a complete duration-scaled shot schedule. Zero duration means not yet estimated.
- Generated outputs are candidate-only: each result is marked `synthetic=true`, served only from the allowlisted Director output directory, and remains `candidate-awaiting-review`. It is not written into the real reference library and cannot be treated as a final photograph.
- The old nine-image Pollinations template path is not used for Director plans.
- Legacy stored plans still use their existing compatibility flow.
- No files were changed in the original C: checkout. No push or production deployment was performed.
- Cloud Worker route requires the existing user authentication and a deployed HTTPS `DIRECTOR_API_BASE`.
  A production Director service must be access-controlled before setting that value; a local 127.0.0.1 address cannot serve a cloud Worker.
- Frontend login blocks complete browser submission acceptance until the owner signs in on the local preview.

## Verification (2026-09-08)

`node --test tests/director-integration.test.mjs`: 6/6 passed.
Inline-script parsing, `node --check api/index.js`, `node --check assets/director-client.js`, and `git diff --check` passed.
Real bridge-to-Director API requests (not mocks):

| Brief | First shot angle | Shots | Input/rejection conditions preserved |
| --- | --- | --- | --- |
| Rain street, high angle | high_angle | 3 | yes |
| Window portrait, seated side pose | eye_level | 3 | yes |
| Street movement, low angle | ground_level | 3 | yes |

These checks prove transport and mapped plan fields, not image quality or complete semantic compliance.
The candidate route was live-smoke-tested in `dry_run` mode and returned `external-generation-condition-ready` without generating a new image.
The identity-lock workflow endpoint was dry-run tested with and without a local reference, including path-boundary rejection; it returns `identity-lock-awaiting-reference` when no identity asset is supplied and `identity-lock-workflow-ready-for-provider` when one is present.
Two single-image external candidates were generated separately for human review. Both remained blocked by the Director release gate; they are not production assets.
The repository's legacy Jest tests have no package manifest or installed runner in current master; they were not reported as passed.
