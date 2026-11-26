import assert from "node:assert/strict";
import { test } from "node:test";
import { baselineModels, DEFAULT_MAX_TOKENS, KNOWN_MODELS, modelsFromListing } from "../src/catalog.ts";

const URL = "https://api.example.test/api/v1";

test("takes the context window from the listing and the rest from the table", () => {
	const [model] = modelsFromListing(
		{ data: [{ id: "qwen3.8-27b", display_name: "Qwen 3.8 27B", max_input_tokens: 200000 }] },
		URL,
	);
	assert.equal(model.name, "Qwen 3.8 27B");
	assert.equal(model.contextWindow, 200000);
	assert.equal(model.maxTokens, DEFAULT_MAX_TOKENS);
	assert.deepEqual(model.input, ["text", "image"]);
	assert.equal(model.reasoning, true);
	assert.equal(model.thinkingLevelMap?.off, "none");
	assert.equal(model.api, "openai-responses");
	assert.equal(model.baseUrl, URL);
});

test("falls back to the table when the listing has no limit", () => {
	const [model] = modelsFromListing({ data: [{ id: "glm-5.2" }] }, URL);
	assert.equal(model.contextWindow, KNOWN_MODELS["glm-5.2"].contextWindow);
	assert.deepEqual(model.input, ["text"]);
});

test("leaves out models without tool calling", () => {
	const ids = modelsFromListing({ data: [{ id: "gemma-4-31b-it" }, { id: "qwen3.5-397b" }, { id: "glm-5.2" }] }, URL).map(
		(model) => model.id,
	);
	assert.deepEqual(ids, ["glm-5.2"]);
});

test("offers an unknown model with conservative defaults", () => {
	const [model] = modelsFromListing({ data: [{ id: "new-model", max_input_tokens: 65536 }] }, URL);
	assert.equal(model.reasoning, false);
	assert.deepEqual(model.input, ["text"]);
	assert.equal(model.contextWindow, 65536);
	assert.equal(model.maxTokens, 32768);
});

test("models without a reasoning level table run with thinking off", () => {
	const [model] = modelsFromListing({ data: [{ id: "gemma-4-26b-a4b-it" }] }, URL);
	assert.equal(model.reasoning, false);
	assert.equal(model.thinkingLevelMap, undefined);
});

test("rejects a response without a data list", () => {
	assert.throws(() => modelsFromListing({ error: "nope" }, URL));
});

test("baseline lists only tool-calling models", () => {
	const ids = baselineModels(URL).map((model) => model.id);
	assert.ok(ids.includes("glm-5.2"));
	assert.ok(!ids.includes("gemma-4-31b-it"));
	assert.ok(!ids.includes("qwen3.5-397b"));
});
