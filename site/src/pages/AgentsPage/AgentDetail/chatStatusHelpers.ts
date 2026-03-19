const PROVIDER_STATUS_URLS: Record<string, string> = {
	anthropic: "https://status.anthropic.com",
};

export const getErrorTitle = (
	kind: string,
	mode: "retry" | "error",
): string => {
	switch (kind) {
		case "overloaded":
			return "Service overloaded";
		case "rate_limit":
			return "Rate limited";
		case "timeout":
			return "Request timeout";
		default:
			return mode === "retry" ? "Retrying request" : "Request failed";
	}
};

export const formatRetryDelay = (delayMs?: number): string | null => {
	if (delayMs === undefined || delayMs <= 0) {
		return null;
	}
	if (delayMs < 1000) {
		return `${delayMs} ms`;
	}
	if (delayMs < 60_000) {
		const seconds = delayMs / 1000;
		return `${seconds.toFixed(seconds >= 10 ? 0 : 1).replace(/\.0$/, "")} seconds`;
	}
	const minutes = delayMs / 60_000;
	return `${minutes.toFixed(minutes >= 10 ? 0 : 1).replace(/\.0$/, "")} minutes`;
};

export const getProviderStatusURL = (
	kind: string,
	provider?: string,
): string | undefined => {
	if (!provider || kind !== "overloaded") {
		return undefined;
	}
	return PROVIDER_STATUS_URLS[provider.toLowerCase()];
};
