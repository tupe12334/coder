import type { ChatDetailError } from "../usageLimitMessage";
import { describe, expect, it } from "vitest";
import { deriveLiveStatus } from "./liveStatusModel";
import type { RetryState, StreamState } from "./types";

const makeStreamState = (): StreamState => ({
	blocks: [],
	toolCalls: {},
	toolResults: {},
	sources: [],
});

const makeRetryState = (overrides: Partial<RetryState> = {}): RetryState => ({
	attempt: 2,
	error: "Retrying request shortly.",
	kind: "generic",
	provider: "anthropic",
	delayMs: 2000,
	retryingAt: "2026-03-10T00:00:02.000Z",
	...overrides,
});

const makeStreamError = (
	overrides: Partial<ChatDetailError> = {},
): ChatDetailError => ({
	kind: "generic",
	message: "Chat processing failed.",
	provider: "anthropic",
	retryable: false,
	statusCode: 500,
	...overrides,
});

const derive = (
	overrides: Partial<Parameters<typeof deriveLiveStatus>[0]> = {},
) =>
	deriveLiveStatus({
		streamState: null,
		retryState: null,
		streamError: null,
		delayedStartup: false,
		isAwaitingFirstStreamChunk: false,
		...overrides,
	});

describe("deriveLiveStatus", () => {
	it("returns idle when no live inputs are present", () => {
		expect(derive()).toEqual({ phase: "idle" });
	});

	it("returns starting while awaiting the first chunk", () => {
		expect(derive({ isAwaitingFirstStreamChunk: true })).toEqual({
			phase: "starting",
		});
	});

	it("returns delayed_start when delayed startup is active", () => {
		expect(derive({ delayedStartup: true })).toEqual({
			phase: "delayed_start",
		});
	});

	it("returns retrying details from retryState", () => {
		expect(derive({ retryState: makeRetryState() })).toEqual({
			phase: "retrying",
			title: "Retrying request",
			kind: "generic",
			message: "Retrying request shortly.",
			attempt: 2,
			provider: "anthropic",
			delayMs: 2000,
			retryingAt: "2026-03-10T00:00:02.000Z",
		});
	});

	it("returns failed details from streamError", () => {
		expect(derive({ streamError: makeStreamError() })).toEqual({
			phase: "failed",
			title: "Request failed",
			kind: "generic",
			message: "Chat processing failed.",
			provider: "anthropic",
			retryable: false,
			statusCode: 500,
		});
	});

	it("returns streaming when streamState exists with no higher priority status", () => {
		expect(derive({ streamState: makeStreamState() })).toEqual({
			phase: "streaming",
		});
	});

	it("prioritizes retrying over failed", () => {
		expect(
			derive({
				retryState: makeRetryState({ kind: "rate_limit" }),
				streamError: makeStreamError({ kind: "timeout" }),
			}),
		).toMatchObject({ phase: "retrying", kind: "rate_limit" });
	});

	it("prioritizes failed over delayed_start", () => {
		expect(
			derive({
				streamError: makeStreamError({ kind: "timeout" }),
				delayedStartup: true,
			}),
		).toMatchObject({ phase: "failed", kind: "timeout" });
	});

	it("prioritizes delayed_start over starting", () => {
		expect(
			derive({ delayedStartup: true, isAwaitingFirstStreamChunk: true }),
		).toEqual({ phase: "delayed_start" });
	});

	it("prioritizes starting over streaming", () => {
		expect(
			derive({
				streamState: makeStreamState(),
				isAwaitingFirstStreamChunk: true,
			}),
		).toEqual({ phase: "starting" });
	});
});
