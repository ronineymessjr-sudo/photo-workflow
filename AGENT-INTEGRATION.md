# PhotoAtelier Agent integration

## Locations

- Agent workflow: `worker/src/agent/workflow.js`
- Public Worker router: `worker/src/index.js`
- Browser client: `src/core/api-client.js`
- V5 gateways: `src/v5/gateways/http-gateways.js`
- Cloudflare configuration: `worker/wrangler.toml`

## Model provider contract

Configure these Worker secrets or variables:

- `AGENT_ENDPOINT`: HTTPS endpoint that accepts the planning request.
- `AGENT_API_KEY`: optional bearer token sent only from the Worker.
- `AGENT_MODEL`: optional model label stored with the draft.

The Worker sends:

```json
{
  "prompt_version": "photoatelier-planner-v1",
  "schema_version": "photoatelier.agent-plan.v1",
  "context": {},
  "options": {}
}
```

The provider returns either the plan object or `{ "plan": { ... } }`. The Worker validates the response with the existing JSON shape and photography rules. A provider failure falls back to deterministic generation.

## Client API

The production browser uses the same-origin base `/api/worker`. Direct Worker access remains available for server integrations.

- `GET /api/health`: public health and provider mode.
- `POST /api/v1/agent/plans/draft`: create a draft from `project_id`.
- `GET /api/v1/agent/runs/:runId`: read draft status.
- `POST /api/v1/agent/runs/:runId/regenerate`: regenerate an unapproved draft.
- `POST /api/v1/agent/runs/:runId/approve`: approve and write formal records.

All Agent endpoints except health require `X-PhotoAtelier-Token`. Do not distribute the owner sync token to public users. Issue separate scoped access through a gateway before allowing third parties to call these endpoints.

The first generation writes only a Plan draft. Shots, Tasks, and LUTs are written only after approval. This boundary must remain unchanged.
