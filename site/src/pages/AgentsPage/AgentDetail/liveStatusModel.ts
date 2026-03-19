import type { ChatDetailError } from "../usageLimitMessage";
import { getErrorTitle } from "./chatStatusHelpers";
import type { RetryState, StreamState } from "./types";

export type LiveStatusModel =
	| { phase: "idle" }
	| { phase: "starting" }
	| { phase: "delayed_start" }
	| { phase: "streaming" }
	| {
			phase: "retrying";
			title: string;
			kind: string;
			message: string;
			attempt: number;
			provider?: string;
			delayMs?: number;
			retryingAt?: string;
	  }
	| {
			phase: "failed";
			title: string;
			kind: string;
			message: string;
			provider?: string;
			retryable?: boolean;
			statusCode?: number;
	  };

export type DeriveLiveStatusParams = {
	streamState: StreamState | null;
	retryState: RetryState | null;
	streamError: ChatDetailError | null;
	delayedStartup: boolean;
	isAwaitingFirstStreamChunk: boolean;
};

export const toFailedLiveStatus = (
	error: ChatDetailError,
): Extract<LiveStatusModel, { phase: "failed" }> => ({
	phase: "failed",
	title: getErrorTitle(error.kind, "error"),
	kind: error.kind,
	message: error.message,
	provider: error.provider,
	retryable: error.retryable,
	statusCode: error.statusCode,
});

export const deriveLiveStatus = ({
	streamState,
	retryState,
	streamError,
	delayedStartup,
	isAwaitingFirstStreamChunk,
}: DeriveLiveStatusParams): LiveStatusModel => {
	if (retryState) {
		return {
			phase: "retrying",
			title: getErrorTitle(retryState.kind, "retry"),
			kind: retryState.kind,
			message: retryState.error,
			attempt: retryState.attempt,
			provider: retryState.provider,
			delayMs: retryState.delayMs,
			retryingAt: retryState.retryingAt,
		};
	}

	if (streamError) {
		return toFailedLiveStatus(streamError);
	}

	if (delayedStartup) {
		return { phase: "delayed_start" };
	}

	if (isAwaitingFirstStreamChunk) {
		return { phase: "starting" };
	}

	if (streamState !== null) {
		return { phase: "streaming" };
	}

	return { phase: "idle" };
};
