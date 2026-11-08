/** V5: model-independent server orchestration. The LLM never executes tools or chooses authoritative IDs. */
import { executeTool, buildReferenceProposal } from "./core.mjs";
import { isMultiPersonRequested } from "./pose-suitability.mjs";

const KINDS = ["pose", "costume", "portrait"];
const intentWord = {
  pose: /坐姿|站姿|姿势|动作|体态|走路|行走|回眸|靠墙|倚靠|抓拍|pose|posture|standing|sitting/i,
  costume:
    /服装|服饰|穿搭|搭配|衣服|衣装|衬衫|毛衣|针织|裙子|coat|outfit|shirt|costume|clothes|knit/i,
  portrait:
    /人像造型|妆发|妆容|发型|发色|长发|短发|中发|肖像|portrait|hairstyle|hair|styling/i,
};
const kindDisabled = {
  pose: /不(?:要|用|需要|必)(?:.{0,4})(?:姿势|动作)|无需(?:.{0,4})(?:姿势|动作)/,
  costume:
    /不(?:要|用|需要|必)(?:.{0,4})(?:服装|衣服|穿搭)|无需(?:.{0,4})(?:服装|穿搭)/,
  portrait:
    /不(?:要|用|需要|必)(?:.{0,4})(?:妆发|发型|造型)|无需(?:.{0,4})(?:妆发|造型)/,
};
const suggestions = {
  pose: "可以指定坐姿、站姿或靠墙等动作",
  costume: "可以指定季节、色系和服装类型",
  portrait: "可以指定发型或妆发风格",
};
function has(x, rx) {
  return rx.test(x);
}
function shouldSkip(prompt) {
  return /不要搜图库|不要搜索图库|无需检索|不(?:用|要)查模板|不要搜索任何模板/.test(
    prompt,
  );
}
function chooseQuery(kind, prompt) {
  if (kind === "pose") {
    if (/(?:霓虹|太空人|宇航员|火星)/.test(prompt))
      return { query: "霓虹色太空人" };
    if (/靠墙|倚靠|墙边|leaning/.test(prompt)) return { query: "靠墙" };
    if (/回眸|回头|look back/i.test(prompt)) return { query: "回眸" };
    if (/走路|行走|抓拍|街拍|walk/i.test(prompt)) return { query: "行走" };
    if (/坐姿|坐着|坐下|sitting/.test(prompt)) return { query: "坐姿" };
    if (/站姿|站着|站立|standing/.test(prompt)) return { query: "站姿" };
    return { query: "" };
  }
  if (kind === "costume") {
    if (/(?:霓虹|太空人|宇航员|火星)/.test(prompt))
      return { query: "霓虹色太空人" };
    if (/白|white|衬衫|shirt|简约/.test(prompt))
      return {
        query: "白色",
        ...(has(prompt, /白|white/) ? { color: "white" } : {}),
      };
    if (/棕|brown|咖啡色|针织|毛衣|秋|autumn|knit/.test(prompt))
      return {
        query: [
          has(prompt, /秋|autumn|fall/) ? "秋日" : "",
          has(prompt, /针织|毛衣|knit/) ? "针织" : "",
          has(prompt, /棕|brown|咖啡色/) ? "棕色" : "",
        ]
          .filter(Boolean)
          .join(" "),
        ...(has(prompt, /棕|brown|咖啡色/) ? { color: "brown" } : {}),
      };
    return { query: "服装" };
  }
  if (/(?:霓虹|太空人|宇航员|火星)/.test(prompt))
    return { query: "霓虹色太空人" };
    if (/中长发|及肩|semilong/.test(prompt))
    return { query: "中长发", hair: "semilong", section: "face" };
  if (/短发|short hair/.test(prompt))
    return { query: "短发", hair: "short", section: "face" };
  return { query: "", section: "face" };
}
function poseQueries(prompt) {
  const choices = [
    [/站姿|站立|standing/i, "站姿"],
    [/回眸|回头|look back/i, "回眸"],
    [/走路|行走|抓拍|街拍|walk/i, "行走"],
    [/坐姿|坐着|坐下|sitting/i, "坐姿"],
    [/靠栏杆|栏杆/i, "栏杆"],
    [/靠墙|轻靠|倚靠|leaning/i, "靠墙"],
  ];
  return choices.filter(([pattern]) => pattern.test(prompt)).map(([, query]) => query);
}
export function parseServerIntent(prompt) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 1800)
    throw Error("INVALID_PROMPT");
  if (shouldSkip(prompt))
    return {
      requestedKinds: [],
      specs: [],
      reason: "explicit-no-search",
      confidence: 1,
    };
  const requestedKinds = KINDS.filter(
    (k) => has(prompt, intentWord[k]) && !has(prompt, kindDisabled[k]),
  );
  const only = /只要|仅要|只需|仅需|只找|只看|only/i.test(prompt);
  const scopes = only ? requestedKinds : requestedKinds;
  const specs = scopes.flatMap((kind) => {
    if (kind === "pose") {
      const queries = poseQueries(prompt);
      if (queries.length > 1) return queries.map((query) => ({ kind, args: { query, limit: 4 } }));
    }
    return [{ kind, args: { ...chooseQuery(kind, prompt), limit: 4 } }];
  });
  return {
    requestedKinds: scopes,
    specs,
    reason: scopes.length ? "explicit-keywords" : "ambiguous",
    confidence: scopes.length ? 0.92 : 0.35,
  };
}
export function validateModelHints(raw, intent) {
  if (raw === null || raw === undefined) return null;
  let o = raw;
  if (typeof raw === "string") {
    if (raw.length > 4000) return null;
    try {
      o = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (
    !o ||
    typeof o !== "object" ||
    Array.isArray(o) ||
    !Array.isArray(o.searches) ||
    o.searches.length > 3
  )
    return null;
  if (
    o.searches.some(
      (s) =>
        !s ||
        typeof s !== "object" ||
        !KINDS.includes(s.kind) ||
        typeof s.query !== "string" ||
        s.query.length > 80 ||
        Object.keys(s).some((k) => !["kind", "query"].includes(k)),
    )
  )
    return null;
  // The model cannot insert categories when the user explicitly limited the scope.
  if (
    intent.requestedKinds.length &&
    o.searches.some((s) => !intent.requestedKinds.includes(s.kind))
  )
    return null;
  return o.searches.map((s) => ({
    kind: s.kind,
    args: { query: s.query, limit: 4 },
  }));
}
function selectTop(results, allowIds) {
  const poseRows = results.filter(row => row.tool === "search_pose");
  const poses = [];
  const addPose = entry => {
    if (entry && allowIds.has(entry.id) && !poses.includes(entry.id) && poses.length < 4) poses.push(entry.id);
  };
  poseRows.forEach(row => addPose(row.results[0]));
  poseRows.forEach(row => row.results.forEach(addPose));
  const firstFor = tool => results.find(row => row.tool === tool)?.results.find(entry => entry && allowIds.has(entry.id))?.id;
  return [...poses, firstFor("search_costume"), firstFor("search_portrait")].filter(Boolean).slice(0, 6);
}
export function runServerFirst({ registry, prompt, modelHints = null, requireImageReferences = false, naturalPoseOnly = false, poseContext = null } = {}) {
  const resolvedPoseContext = poseContext || (isMultiPersonRequested(prompt) ? "multi" : "single");
  const intent = parseServerIntent(prompt);
  // Never reinterpret an explicit, unknown catalog ID as a vague visual intent.
  const explicitIds = [
    ...new Set(
      prompt.match(/\bpa-(?:pose|costume|portrait)-[a-z0-9-]+\b/gi) || [],
    ),
  ];
  if (explicitIds.some((id) => !registry.find(id)))
    return {
      mode: "server-first",
      status: "no-match",
      intent: { ...intent, reason: "unknown-template-id" },
      toolTrace: [],
      selectedIds: [],
      selectedTemplates: [],
      proposal: null,
      reply: "指定的模板 ID 在本地授权库中不存在。",
      modelHintsAccepted: false,
      backendCalls: 0,
      externalTemplateRequests: 0,
    };
  const hints = validateModelHints(modelHints, intent);
  const queries = intent.specs.length ? intent.specs : hints || [];
  const toolTrace = [],
    authorized = new Set();
  for (const { kind, args } of queries) {
    const name = {
      pose: "search_pose",
      costume: "search_costume",
      portrait: "search_portrait",
    }[kind];
    const output = executeTool(registry, name, { ...args, ...(requireImageReferences ? { requireImageReferences: true } : {}), ...(kind === "pose" ? { poseContext: resolvedPoseContext, ...(naturalPoseOnly ? { naturalPoseOnly: true } : {}) } : {}) });
    const results = output.results.map((t) => ({ ...t }));
    results.forEach((t) => authorized.add(t.id));
    toolTrace.push({ tool: name, args, resultCount: output.total, results });
  }
  const ids = selectTop(toolTrace, authorized);
  const chosen = ids.map((id) => registry.find(id)).filter(Boolean);
  const state = ids.length
    ? "proposal-ready"
    : queries.length
      ? "no-match"
      : "needs-clarification";
  return {
    mode: "server-first",
    status: state,
    intent: {
      requestedKinds: intent.requestedKinds,
      reason: intent.reason,
      confidence: intent.confidence,
    },
    toolTrace,
    selectedIds: ids,
    selectedTemplates: chosen,
    proposal: null,
    reply:
      state === "needs-clarification"
        ? "请补充想找的姿势、服装或妆发参考。"
        : state === "no-match"
          ? "本地已授权图库未找到匹配结果，可调整条件。"
          : `已从本地授权图库检索并匹配 ${ids.length} 个候选模板，请确认后加入拍摄方案。`,
    modelHintsAccepted: Boolean(!intent.specs.length && hints?.length),
    backendCalls: queries.length,
    externalTemplateRequests: 0,
  };
}
export function proposeFromServerResult(
  registry,
  result,
  { planId, expectedRevision } = {},
) {
  if (
    !result ||
    result.mode !== "server-first" ||
    result.status !== "proposal-ready"
  )
    throw Error("INVALID_RESULT");
  if (result.selectedIds.some((id) => !registry.find(id)))
    throw Error("INVALID_SELECTED_ID");
  return buildReferenceProposal(registry, {
    planId,
    expectedRevision,
    templateIds: result.selectedIds,
  });
}
/** Optional ONE model call. Model only labels underspecified intent, never chooses raw template IDs. */
export async function runWeakModelAssisted({
  registry,
  prompt,
  provider = null,
  requireImageReferences = false,
  naturalPoseOnly = false,
  poseContext = null,
} = {}) {
  const deterministic = parseServerIntent(prompt);
  if (
    deterministic.specs.length ||
    deterministic.reason === "explicit-no-search" ||
    !provider
  ) {
    return {
      ...runServerFirst({ registry, prompt, requireImageReferences, naturalPoseOnly, poseContext }),
      modelCalls: 0,
      modelStatus: provider ? "not-needed" : "not-configured",
    };
  }
  let hints = null,
    modelStatus = "invalid-hints";
  try {
    const resp = await provider.complete(
      [
        {
          role: "system",
          content:
            'Return ONLY a JSON object {"searches":[{"kind":"pose|costume|portrait","query":"short keywords"}]}, or {"searches":[]}. Never return template IDs or write data. Maximum three searches. Infer only from the user message; if ambiguous, return empty.',
        },
        { role: "user", content: prompt },
      ],
      [],
      { toolChoice: "none" },
    );
    hints = resp.content;
    if (validateModelHints(hints, deterministic) !== null)
      modelStatus = "hints-accepted";
  } catch (e) {
    modelStatus = "model-error";
  }
  return {
    ...runServerFirst({ registry, prompt, modelHints: hints, requireImageReferences, naturalPoseOnly, poseContext }),
    modelCalls: 1,
    modelStatus,
  };
}
