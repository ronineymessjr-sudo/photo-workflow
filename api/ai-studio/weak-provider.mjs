/** V5: low-cost, one-shot intent-only adapter for OpenAI-compatible Chat Completions. */
export function createWeakProvider({
  apiKey,
  baseUrl = "https://api.openai.com/v1",
  model = "gpt-5.4-nano",
  timeoutMs = 15000,
  fetchImpl = fetch,
} = {}) {
  if (typeof apiKey !== "string" || !apiKey.trim())
    throw Error("API_KEY_NOT_CONFIGURED");
  if (!/^[a-z0-9][a-z0-9._-]{1,100}$/i.test(model))
    throw Error("INVALID_MODEL");
  const url = new URL(baseUrl);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.hostname
  )
    throw Error("INVALID_PROVIDER_URL");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 500 || timeoutMs > 60000)
    throw Error("INVALID_TIMEOUT");
  const endpoint = new URL(
    url.pathname.replace(/\/$/, "") + "/chat/completions",
    url.origin,
  ).toString();
  const metrics = {
    model,
    callCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    errors: 0,
    lastMs: null,
  };
  return {
    model,
    getMetrics: () => ({ ...metrics }),
    async complete(messages) {
      const body = {
        model,
        messages,
        max_completion_tokens: 512,
        n: 1,
        stream: false,
      };
      if (url.hostname === "api.deepseek.com") {
        delete body.max_completion_tokens;
        body.max_tokens = 512;
        body.thinking = { type: "disabled" };
        body.response_format = { type: "json_object" };
      }
      if (/^gpt-5\.(?:4|5)/.test(model)) body.reasoning_effort = "none";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs),
        start = performance.now();
      metrics.callCount++;
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw Error("MODEL_HTTP_" + response.status);
        }
        const data = await response.json();
        const message = data?.choices?.[0]?.message;
        if (!message || typeof message.content !== "string")
          throw Error("INVALID_MODEL_RESPONSE");
        metrics.inputTokens += Math.max(
          0,
          Number(data.usage?.prompt_tokens) || 0,
        );
        metrics.outputTokens += Math.max(
          0,
          Number(data.usage?.completion_tokens) || 0,
        );
        return { role: "assistant", content: message.content };
      } catch (e) {
        metrics.errors++;
        if (e?.name === "AbortError") throw Error("MODEL_TIMEOUT");
        throw e;
      } finally {
        clearTimeout(timer);
        metrics.lastMs = Math.round(performance.now() - start);
      }
    },
  };
}
