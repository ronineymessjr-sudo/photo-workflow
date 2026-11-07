/** Pure, offline TemplateRegistry engine. Never fetches upstream content. */
export const KINDS = ["pose", "costume", "portrait"];
export const RIGHTS = [
  "owned",
  "licensed",
  "external_reference",
  "link_only",
  "blocked",
];
const SEARCH_ALIASES = [
  ["坐姿", ["坐姿", "坐着", "坐下", "坐"]],
  ["站姿", ["站姿", "站着", "站立"]],
  ["秋日", ["秋日", "秋季", "秋天", "秋", "autumn", "fall"]],
  ["棕色", ["棕色", "咖啡色", "brown"]],
  ["针织", ["针织", "毛衣", "knit"]],
  ["电影感", ["电影感", "电影", "cinematic"]],
  ["中长发", ["中长发", "及肩", "semilong"]],
  ["短发", ["短发", "short hair"]],
  ["侧面", ["侧面", "侧拍", "side"]],
];
export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim();
}
function aliases(query) {
  const q = normalizeText(query);
  return SEARCH_ALIASES.filter(([, alts]) =>
    alts.some((x) => q.includes(x)),
  ).map(([x]) => x);
}
export function validateTemplate(entry) {
  if (
    !entry ||
    typeof entry !== "object" ||
    !/^[a-z0-9][a-z0-9_-]{2,63}$/.test(entry.id ?? "")
  )
    throw Error("INVALID_ID");
  if (!KINDS.includes(entry.kind)) throw Error("INVALID_KIND");
  if (
    typeof entry.title !== "string" ||
    !entry.title.trim() ||
    entry.title.length > 120
  )
    throw Error("INVALID_TITLE");
  if (
    !Array.isArray(entry.tags) ||
    entry.tags.length > 24 ||
    entry.tags.some((x) => typeof x !== "string" || x.length > 48)
  )
    throw Error("INVALID_TAGS");
  if (!entry.rights || !RIGHTS.includes(entry.rights.status))
    throw Error("INVALID_RIGHTS");
  const permissions = entry.rights.allowedUses;
  if (
    !Array.isArray(permissions) ||
    permissions.some((x) => !["public-display", "agent-reference"].includes(x))
  )
    throw Error("INVALID_ALLOWED_USES");
  if (["owned", "licensed"].includes(entry.rights.status)) {
    if (
      typeof entry.rights.evidence !== "string" ||
      entry.rights.evidence.trim().length < 8
    )
      throw Error("EVIDENCE_REQUIRED");
  } else if (entry.asset) throw Error("COPY_NOT_AUTHORIZED");
  if (
    entry.asset &&
    (!["owned", "licensed"].includes(entry.rights.status) ||
      !permissions.includes("public-display") ||
      !/^assets\/[a-z0-9_-]{3,64}\.(png|jpg|jpeg|webp)$/.test(entry.asset))
  )
    throw Error("INVALID_ASSET");
  if (entry.source?.type === "poseatlas") {
    if (typeof entry.source?.url !== "string" || !isAtlasLink(entry.source.url))
      throw Error("UNTRUSTED_SOURCE");
    if (entry.rights.status === "owned") throw Error("THIRD_PARTY_NOT_OWNED");
  }
  if (
    entry.rights.status === "external_reference" &&
    (entry.source?.type !== "poseatlas" || entry.asset)
  )
    throw Error("INVALID_EXTERNAL_REFERENCE");
  if (
    entry.rights.status === "link_only" &&
    (entry.tags.length > 0 || entry.description)
  )
    throw Error("LINK_ONLY_NO_MIRRORED_METADATA");
  return entry;
}
export function isAtlasLink(raw) {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      u.hostname === "hruiccc.github.io" &&
      [
        "/RuiC-PoseAtlas/",
        "/RuiC-PoseAtlas/index.html",
        "/RuiC-PoseAtlas/face.html",
        "/RuiC-PoseAtlas/costume.html",
      ].includes(u.pathname) &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
function canDisplay(t) {
  return (
    ["owned", "licensed"].includes(t.rights.status) &&
    t.rights.allowedUses.includes("public-display")
  );
}
function canAgent(t) {
  return (
    (canDisplay(t) || t.rights.status === "external_reference") &&
    t.rights.allowedUses.includes("agent-reference")
  );
}
export function safeCard(t) {
  const {
    id,
    kind,
    title,
    englishTitle,
    description,
    tags,
    category,
    series,
    angles,
    season,
    color,
    section,
    hair,
    asset,
    source,
    upstreamId,
    poseNumber,
  } = t;
  return {
    id,
    kind,
    title,
    description: description ?? "",
    englishTitle: englishTitle || '',
    tags,
    category,
    series,
    angles,
    season,
    color,
    section,
    hair,
    upstreamId,
    poseNumber,
    assetUrl: canDisplay(t) && asset ? `/${asset}` : null,
    sourceUrl: source?.type === "poseatlas" ? source.url : null,
    referenceImageUrl: source?.type === "poseatlas" ? source.referenceImageUrl || null : null,
    rightsStatus: t.rights.status,
  };
}
export function createRegistry(catalog) {
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.templates))
    throw Error("INVALID_CATALOG");
  const items = catalog.templates.map(validateTemplate);
  const ids = items.map((x) => x.id);
  if (new Set(ids).size !== ids.length) throw Error("DUPLICATE_TEMPLATE_ID");
  const byId = new Map(items.map((x) => [x.id, x]));
  function search(raw = {}) {
    const kind = raw.kind;
    if (kind !== undefined && !KINDS.includes(kind))
      throw Error("INVALID_KIND");
    const limit = raw.limit === undefined ? 12 : Number(raw.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw Error("INVALID_LIMIT");
    const query = String(raw.query ?? "");
    if (query.length > 160) throw Error("QUERY_TOO_LONG");
    const filterKeys = [
      "category",
      "angle",
      "season",
      "color",
      "hair",
      "section",
    ];
    for (const k of filterKeys)
      if (
        raw[k] !== undefined &&
        (typeof raw[k] !== "string" || raw[k].length > 80)
      )
        throw Error("INVALID_FILTER");
    const toks = aliases(query);
    const searchQuery = normalizeText(query);
    const scored = [];
    for (const t of items) {
      if (!canAgent(t) || (kind && t.kind !== kind)) continue;
      if (raw.requireImageReferences && (!t.source?.referenceImageUrl || (t.kind === "portrait" && t.section !== "face"))) continue;
      if (raw.naturalPoseOnly && t.kind === "pose" && /跪|后仰|躺|趴|劈叉|倒立|双手后撑|双腿斜|双腿悬空|挺胸|单腿.*肩高|单腿.*高抬|M字开腿|举过头|手臂上举|双臂上举|抱头|手扶后脑|kneel|reclin|supine|prone|split|inversion|overhead/i.test(`${t.title} ${t.description} ${t.category}`)) continue;
      if (raw.naturalPoseOnly && t.kind === "pose" && /sexy/i.test(t.series || '')) continue;
      if (
        filterKeys.some(
          (k) =>
            raw[k] &&
            (k === "angle"
              ? !(t.angles ?? []).includes(raw[k])
              : normalizeText(t[k]) !== normalizeText(raw[k])),
        )
      )
        continue;
      const corpus = normalizeText(
        [
          t.title,
          t.description,
          ...t.tags,
          t.category,
          t.season,
          t.color,
          t.hair,
          t.section,
        ].join(" "),
      );
      const matches = toks.filter((x) =>
        corpus.includes(normalizeText(x)),
      ).length;
      if (query && !matches && !corpus.includes(searchQuery)) continue;
      const score =
        matches * 10 + (t.kind === 'costume' ? toks.filter(x => normalizeText(t.title).includes(normalizeText(x))).length * 30 : 0)
        + (searchQuery && corpus.includes(searchQuery) ? 20 : 0);
      scored.push({ item: safeCard(t), score });
    }
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        Number(Boolean(b.item.sourceUrl)) - Number(Boolean(a.item.sourceUrl)) ||
        Number(/sexy/i.test(a.item.series || "")) -
          Number(/sexy/i.test(b.item.series || "")) ||
        a.item.id.localeCompare(b.item.id),
    );
    return {
      total: scored.length,
      results: scored.slice(0, limit).map((x) => x.item),
      source: "photoatelier-local-registry",
      externalRequests: 0,
    };
  }
  function find(id) {
    const t = byId.get(id);
    return t && canAgent(t) ? safeCard(t) : null;
  }
  function stats() {
    return {
      totalAvailable: items.filter(canAgent).length,
      byKind: Object.fromEntries(
        KINDS.map((k) => [
          k,
          items.filter((t) => t.kind === k && canAgent(t)).length,
        ]),
      ),
      blockedOrLinkOnly: items.filter((t) => !canAgent(t)).length,
      source: "local",
    };
  }
  return {
    search,
    find,
    stats,
    hasAsset(asset) {
      return items.some((t) => t.asset === asset && canDisplay(t));
    },
  };
}
const TOOL_TO_KIND = {
  search_pose: "pose",
  search_costume: "costume",
  search_portrait: "portrait",
};
export const toolDefinitions = Object.entries(TOOL_TO_KIND).map(
  ([name, kind]) => ({
    type: "function",
    function: {
      name,
      description: `Search authorized ${kind} templates in PhotoAtelier local registry; returns only real catalog IDs.`,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 20 },
          category: { type: "string" },
          angle: { type: "string" },
          season: { type: "string" },
          color: { type: "string" },
          hair: { type: "string" },
          section: { type: "string" },
        },
      },
    },
  }),
);
export function executeTool(registry, name, args) {
  if (!Object.hasOwn(TOOL_TO_KIND, name)) throw Error("UNKNOWN_TOOL");
  if (typeof args !== "object" || args === null || Array.isArray(args))
    throw Error("INVALID_ARGUMENTS");
  const allow = new Set([
    "query",
    "limit",
    "category",
    "angle",
    "season",
    "color",
    "hair",
    "section",
    "requireImageReferences",
    "naturalPoseOnly",
  ]);
  if (Object.keys(args).some((k) => !allow.has(k)))
    throw Error("UNKNOWN_ARGUMENT");
  return registry.search({ ...args, kind: TOOL_TO_KIND[name] });
}
export function buildReferenceProposal(
  registry,
  { planId, expectedRevision, templateIds },
) {
  if (
    typeof planId !== "string" ||
    !planId.trim() ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0
  )
    throw Error("INVALID_PLAN");
  if (
    !Array.isArray(templateIds) ||
    templateIds.length === 0 ||
    templateIds.length > 30 ||
    new Set(templateIds).size !== templateIds.length
  )
    throw Error("INVALID_SELECTION");
  const commands = templateIds.map((id) => {
    const t = registry.find(id);
    if (!t) throw Error(`UNAVAILABLE_TEMPLATE:${String(id).slice(0, 60)}`);
    return {
      type: "upsert_reference",
      reference: {
        id: crypto.randomUUID(),
        source: t.sourceUrl
          ? "poseatlas"
          : t.rightsStatus === "licensed"
            ? "licensed"
            : "original",
        sourceItemId: t.id,
        upstreamId: t.upstreamId,
        poseNumber: t.poseNumber,
        externalUrl: t.sourceUrl || undefined,
        title: t.title,
        licenseStatus: t.sourceUrl
          ? "external-reference"
          : t.rightsStatus === "licensed"
            ? "licensed"
            : "owned",
        attribution: t.sourceUrl ? "RuiC-PoseAtlas" : "PhotoAtelier original",
        createdAt: new Date().toISOString(),
      },
    };
  });
  return {
    id: crypto.randomUUID(),
    planId,
    expectedRevision,
    status: "pending",
    summary: `添加 ${commands.length} 条已授权本地模板引用`,
    commands,
  };
}
