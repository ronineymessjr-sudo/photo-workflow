const REVIEW_VERSION = 'plan-review-v2';
export const REVIEW_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const redactSensitiveText = value => value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/(?:file:\/\/\/|[A-Z]:[\\/]|\\\\)[^\r\n,，;；"'<>|]*/gi, '[redacted-local-path]')
    .replace(/\/(?:Users|home|tmp|var\/tmp)\/[^\r\n,，;；"'<>|]*/g, '[redacted-local-path]');
const text = (value, limit = 240) => typeof value === 'string' ? redactSensitiveText(value).slice(0, limit) : '';

export function buildJevState(plan = {}) {
    const input = plan.input || {};
    const shots = Array.isArray(plan.shotList) ? plan.shotList : [];
    const references = Array.isArray(plan.references) ? plan.references : [];
    return {
        brief: { theme: text(input.theme), style: text(input.style), model: text(input.modelDesc), scene: text(input.scene), mood: text(input.mood), duration: text(input.duration), people: text(input.people), constraints: text(input.extra, 500) },
        shotCount: shots.length,
        shots: shots.slice(0, 16).map((shot, index) => ({ index: index + 1, title: text(shot.title), scene: text(shot.scene), description: text(shot.description, 320), shotSize: text(shot.shotSize), focalLength: text(shot.focalLength), angle: text(shot.angle), lighting: text(typeof shot.lighting === 'string' ? shot.lighting : shot.lightingSetup), props: text(shot.props) })),
        references: { count: references.length, syntheticCount: references.filter(reference => reference && reference.synthetic === true).length },
    };
}

export function buildJevQuestions(plan = {}) {
    const questions = {
        brief_sufficient: { type: 'noul', instructions: 'The brief contains enough information to produce an actionable photography plan.' },
        shot_sequence_quality: { type: 'score', instructions: 'How coherent and varied is the shot sequence for a real photography session?', criteria: ['Fragmented, repetitive, or missing essential coverage', 'Usable with several items needing confirmation', 'Coherent, varied, and ready for practical review'] },
        execution_feasibility: { type: 'score', instructions: 'How feasible is this shot sequence to execute with the supplied conditions?', criteria: ['Not feasible without major missing information', 'Feasible after checking several conditions on site', 'Feasible with clear actions and reasonable equipment needs'] },
        duplicate_risk: { type: 'noul', instructions: 'The shot sequence contains substantial duplication in framing, action, or visual purpose.' },
    };
    if (Array.isArray(plan.references) && plan.references.length) questions.reference_alignment = { type: 'score', instructions: 'How well do the supplied references support the brief and the shot sequence?', criteria: ['References are missing, weak, or poorly aligned', 'References are partially useful but need selection', 'References clearly support the intended visual direction'] };
    return questions;
}

const score = answer => answer && typeof answer.score === 'number' ? answer.score : null;
const confidence = answer => answer && typeof answer.confidence === 'number' ? answer.confidence : null;
const noul = answer => answer && typeof answer.noul === 'number' ? answer.noul : null;

function verdict(answers) {
    const concerns = [];
    if (noul(answers.brief_sufficient) !== null && noul(answers.brief_sufficient) < 0.6) concerns.push('brief');
    if (noul(answers.duplicate_risk) !== null && noul(answers.duplicate_risk) >= 0.6) concerns.push('duplicate');
    if (score(answers.shot_sequence_quality) < 2) concerns.push('coverage');
    if (score(answers.execution_feasibility) < 2) concerns.push('execution');
    if (answers.reference_alignment && score(answers.reference_alignment) < 2) concerns.push('references');
    const confidences = [confidence(answers.shot_sequence_quality), confidence(answers.execution_feasibility), confidence(answers.reference_alignment)].filter(value => value !== null);
    const minConfidence = confidences.length ? Math.min(...confidences) : 1;
    if (concerns.includes('brief')) return { verdict: 'supplement', concerns, confidence: minConfidence };
    if (concerns.length || minConfidence < 0.6) return { verdict: 'confirm', concerns, confidence: minConfidence };
    return { verdict: 'ready', concerns, confidence: minConfidence };
}

function hasValidAnswers(questions, answers) {
    return Object.entries(questions).every(([key, question]) => {
        const answer = answers[key];
        if (!answer || typeof answer !== 'object') return false;
        if (question.type === 'noul') return Number.isFinite(answer.noul) && answer.noul >= 0 && answer.noul <= 1;
        if (question.type === 'score') {
            const maxScore = Array.isArray(question.criteria) ? question.criteria.length - 1 : 2;
            return Number.isFinite(answer.score) && answer.score >= 0 && answer.score <= maxScore
                && Number.isFinite(answer.confidence) && answer.confidence >= 0 && answer.confidence <= 1;
        }
        return false;
    });
}

function buildReviewSchema(questions) {
    const properties = {};
    for (const [key, question] of Object.entries(questions)) {
        properties[key] = question.type === 'noul'
            ? { type: 'object', properties: { noul: { type: 'number', minimum: 0, maximum: 1 } }, required: ['noul'], additionalProperties: false }
            : { type: 'object', properties: { score: { type: 'number', minimum: 0, maximum: 2 }, confidence: { type: 'number', minimum: 0, maximum: 1 } }, required: ['score', 'confidence'], additionalProperties: false };
    }
    return {
        type: 'object',
        properties: { answers: { type: 'object', properties, required: Object.keys(questions), additionalProperties: false } },
        required: ['answers'],
        additionalProperties: false,
    };
}

function readAnswers(response) {
    let payload = response && Object.prototype.hasOwnProperty.call(response, 'response') ? response.response : response;
    if (typeof payload === 'string') payload = JSON.parse(payload);
    return payload && payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
}

function classifyEvaluationFailure(error) {
    const message = String(error && error.message || error || '').toLowerCase();
    if (/unauthor|forbidden|permission|access denied/.test(message)) return 'ai_access_denied';
    if (/quota|rate.?limit|too many requests/.test(message)) return 'ai_rate_limited';
    if (/model.*(?:not found|unavailable|unsupported)|unknown model/.test(message)) return 'ai_model_unavailable';
    if (/invalid|schema|validation|bad request|json mode/.test(message)) return 'ai_invalid_request';
    if (/timeout|timed out/.test(message)) return 'ai_timeout';
    return 'evaluation_failed';
}

export async function evaluateJevPlan(plan, env, { now = new Date().toISOString() } = {}) {
    if (!env || !env.AI || typeof env.AI.run !== 'function') return { version: REVIEW_VERSION, status: 'unavailable', reason: 'ai_binding_not_configured', evaluatedAt: now };
    try {
        const questions = buildJevQuestions(plan);
        const response = await env.AI.run(REVIEW_MODEL, {
            messages: [
                { role: 'system', content: 'Evaluate a photography plan. For noul questions, return the probability from 0 to 1 that the statement is true. For score questions, use the supplied 0 to 2 rubric and return confidence from 0 to 1. Return only the requested JSON.' },
                { role: 'user', content: JSON.stringify({ state: buildJevState(plan), questions }) },
            ],
            response_format: { type: 'json_schema', json_schema: buildReviewSchema(questions) },
            temperature: 0,
            max_tokens: 500,
        });
        const answers = readAnswers(response);
        if (!hasValidAnswers(questions, answers)) return { version: REVIEW_VERSION, status: 'unavailable', reason: 'invalid_response', evaluatedAt: now };
        return { version: REVIEW_VERSION, status: 'ok', model: REVIEW_MODEL, answers, ...verdict(answers), evaluatedAt: now };
    } catch (error) {
        console.error('Plan review failed', { name: error && error.name, message: error && error.message });
        return { version: REVIEW_VERSION, status: 'unavailable', reason: classifyEvaluationFailure(error), evaluatedAt: now };
    }
}

export async function attachJevReview(plan, env, options) {
    return { ...plan, director: { ...(plan.director || {}), jevReview: await evaluateJevPlan(plan, env, options) } };
}
