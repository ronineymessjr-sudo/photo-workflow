import { createServer } from './serve-director.mjs';
import { createGuestPlanDraft } from '../api/director-plan.mjs';

const port = Number(process.argv[2] || 8126);
// Explicit local rule-draft preview. This is not a Director/model availability fallback.
createServer({ planFactory: createGuestPlanDraft }).listen(port, '127.0.0.1', () => {
    console.log(`Workflow preview: http://127.0.0.1:${port}/ (rule drafts; no image API calls)`);
});
