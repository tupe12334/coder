import { API } from "api/api";
import type {
	AIBridgeListInterceptionsResponse,
	AIBridgeListSessionsResponse,
	AIBridgeSessionThreadsResponse,
} from "api/typesGenerated";
import { useFilterParamsKey } from "components/Filter/Filter";
import type { UsePaginatedQueryOptions } from "hooks/usePaginatedQuery";
import type { UseInfiniteQueryOptions } from "react-query";

export const paginatedInterceptions = (
	searchParams: URLSearchParams,
): UsePaginatedQueryOptions<AIBridgeListInterceptionsResponse, string> => {
	return {
		searchParams,
		queryPayload: () => searchParams.get(useFilterParamsKey) ?? "",
		queryKey: ({ payload, pageNumber }) => {
			return ["aiBridgeInterceptions", payload, pageNumber] as const;
		},
		queryFn: ({ limit, offset, payload }) =>
			API.getAIBridgeInterceptions({
				offset,
				limit,
				q: payload,
			}),
	};
};

export const paginatedSessions = (
	searchParams: URLSearchParams,
): UsePaginatedQueryOptions<AIBridgeListSessionsResponse, string> => {
	return {
		searchParams,
		queryPayload: () => searchParams.get(useFilterParamsKey) ?? "",
		queryKey: ({ payload, pageNumber }) => {
			return ["aiBridgeSessions", payload, pageNumber] as const;
		},
		queryFn: ({ offset, limit, payload }) =>
			API.getAIBridgeSessionList({
				offset,
				limit,
				q: payload,
			}),
	};
};

type InfiniteSessionQueryOptions = UseInfiniteQueryOptions<
	AIBridgeSessionThreadsResponse,
	string
>;

export const infiniteSession = (
	sessionId: string,
): InfiniteSessionQueryOptions => ({
	queryKey: ["aiBridgeSession", sessionId] as const,
	queryFn: ({ pageParam }) =>
		API.getAIBridgeSession(sessionId, { after_id: pageParam as string }),
	initialPageParam: null,
	getNextPageParam: (lastPage) => {
		return lastPage.id;
	},
});
