import type { Model, ThinkingLevelMap } from "@earendil-works/pi-ai";

export const PROVIDER_ID = "adaption";
export const DEFAULT_BASE_URL = "https://api.prod.adaptionlabs.ai/api/v1";
export const DEFAULT_MAX_TOKENS = 32768;
const UNKNOWN_CONTEXT_WINDOW = 131072;

interface KnownModel {
	tools: boolean;
	vision: boolean;
	contextWindow: number;
	thinkingLevelMap?: ThinkingLevelMap;
	cost: { input: number; output: number; cacheRead: number };
}

// Models without tool calling cannot run pi's agent loop, so they are not offered.
export const KNOWN_MODELS: Readonly<Record<string, KnownModel>> = {
	"glm-5.2": {
		tools: true,
		vision: false,
		contextWindow: 786432,
		thinkingLevelMap: { off: "none", minimal: null, low: null, medium: null, high: "high", xhigh: null, max: "max" },
		cost: { input: 1.4, output: 4.4, cacheRead: 0.26 },
	},
	"glm-5.3-flash": {
		tools: true,
		vision: false,
		contextWindow: 1048576,
		thinkingLevelMap: { off: null, minimal: null, low: "low", medium: null, high: "high", xhigh: null, max: "max" },
		cost: { input: 0.15, output: 0.5, cacheRead: 0.03 },
	},
	"deepseek-v4-flash": {
		tools: true,
		vision: false,
		contextWindow: 1048576,
		thinkingLevelMap: { off: "none", minimal: null, low: "low", medium: null, high: "high", xhigh: null, max: "max" },
		cost: { input: 0.045, output: 0.14, cacheRead: 0.0015 },
	},
	"qwen3.8-27b": {
		tools: true,
		vision: true,
		contextWindow: 262144,
		thinkingLevelMap: { off: "none", minimal: null, low: "low", medium: "medium", high: null, xhigh: "xhigh", max: null },
		cost: { input: 0.039, output: 1.25, cacheRead: 0.0039 },
	},
	"gemma-4-26b-a4b-it": {
		tools: true,
		vision: true,
		contextWindow: 256000,
		cost: { input: 0.077, output: 0.26, cacheRead: 0.043 },
	},
	"nemotron-SEA-LION-v4.8-120b-a12b": {
		tools: true,
		vision: false,
		contextWindow: 262144,
		cost: { input: 0.08, output: 0.45, cacheRead: 0.016 },
	},
	"qwen-SEA-LION-v5-397b-a17b-plus": {
		tools: true,
		vision: true,
		contextWindow: 262144,
		cost: { input: 0.55, output: 3.5, cacheRead: 0.23 },
	},
	"gemma-4-31b-it": {
		tools: false,
		vision: true,
		contextWindow: 256000,
		cost: { input: 0.09, output: 0.34, cacheRead: 0.05 },
	},
	"qwen3.5-397b": {
		tools: false,
		vision: true,
		contextWindow: 131072,
		cost: { input: 0.55, output: 3.5, cacheRead: 0.23 },
	},
};

export interface ListedModel {
	id: string;
	display_name?: string | null;
	max_input_tokens?: number | null;
}

export function toPiModel(listed: ListedModel, baseUrl: string): Model<"openai-responses"> | undefined {
	const known = KNOWN_MODELS[listed.id];
	if (known && !known.tools) return undefined;
	const contextWindow = positive(listed.max_input_tokens) ?? known?.contextWindow ?? UNKNOWN_CONTEXT_WINDOW;
	return {
		id: listed.id,
		name: listed.display_name || listed.id,
		api: "openai-responses",
		provider: PROVIDER_ID,
		baseUrl,
		reasoning: known?.thinkingLevelMap !== undefined,
		...(known?.thinkingLevelMap ? { thinkingLevelMap: known.thinkingLevelMap } : {}),
		input: known?.vision ? ["text", "image"] : ["text"],
		cost: { ...(known?.cost ?? { input: 0, output: 0, cacheRead: 0 }), cacheWrite: 0 },
		contextWindow,
		maxTokens: Math.min(DEFAULT_MAX_TOKENS, contextWindow),
	};
}

export function baselineModels(baseUrl: string): Model<"openai-responses">[] {
	return Object.keys(KNOWN_MODELS).flatMap((id) => toPiModel({ id }, baseUrl) ?? []);
}

export function modelsFromListing(body: unknown, baseUrl: string): Model<"openai-responses">[] {
	const data = (body as { data?: unknown } | null)?.data;
	if (!Array.isArray(data)) throw new Error("Unexpected model list response from Adaption");
	return data.flatMap((entry) =>
		entry && typeof entry === "object" && typeof (entry as ListedModel).id === "string"
			? (toPiModel(entry as ListedModel, baseUrl) ?? [])
			: [],
	);
}

function positive(value: number | null | undefined): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
