import { type ApiKeyAuth, envApiKeyAuth, type Model, type Provider } from "@earendil-works/pi-ai";
import { openAIResponsesApi } from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { baselineModels, DEFAULT_BASE_URL, modelsFromListing, PROVIDER_ID } from "../src/catalog.ts";

const API_KEY_ENV = "ADAPTION_API_KEY";

function baseUrl(): string {
	return (process.env.ADAPTION_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function listModels(url: string, apiKey: string, signal?: AbortSignal): Promise<unknown> {
	const response = await fetch(`${url}/models?type=hosted`, {
		headers: { Authorization: `Bearer ${apiKey}` },
		signal,
	});
	if (response.status === 401 || response.status === 403) {
		throw new Error("Adaption rejected the API key. Check that it is active and has the inference:write scope.");
	}
	if (!response.ok) throw new Error(`Adaption model list failed with HTTP ${response.status}`);
	return response.json();
}

function apiKeyAuth(): ApiKeyAuth {
	const base = envApiKeyAuth("Adaption API key", [API_KEY_ENV]);
	return {
		...base,
		login: async (interaction) => {
			const key = (await interaction.prompt({ type: "secret", message: "Enter your Adaption API key (pt_live_…)" })).trim();
			interaction.signal.throwIfAborted();
			await listModels(baseUrl(), key, interaction.signal);
			return { type: "api_key", key };
		},
	};
}

function adaptionProvider(): Provider<"openai-responses"> {
	const url = baseUrl();
	const baseline = baselineModels(url);
	let live: Model<"openai-responses">[] | undefined;
	const streams = openAIResponsesApi();

	return {
		id: PROVIDER_ID,
		name: "Adaption",
		baseUrl: url,
		auth: { apiKey: apiKeyAuth() },
		getModels: () => live ?? baseline,
		refreshModels: async (context) => {
			const restored = context.stored?.models.filter(
				(model): model is Model<"openai-responses"> => model.provider === PROVIDER_ID,
			);
			if (restored && !(await context.publish({ update: () => (live = restored) }))) return;
			if (!context.allowNetwork || context.signal.aborted) return;
			const key = context.credential?.type === "api_key" ? context.credential.key : undefined;
			if (!key) return;
			const refreshed = modelsFromListing(await listModels(url, key, context.signal), url);
			if (context.signal.aborted) return;
			await context.publish({
				persist: { models: refreshed, checkedAt: Date.now() },
				update: () => (live = refreshed),
			});
		},
		stream: (model, context, options) => streams.stream(model, context, options),
		streamSimple: (model, context, options) => streams.streamSimple(model, context, options),
	};
}

export default function (pi: ExtensionAPI) {
	pi.registerProvider(adaptionProvider());
}
