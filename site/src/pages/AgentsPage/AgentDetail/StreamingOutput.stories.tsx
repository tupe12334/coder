import type { Meta, StoryObj } from "@storybook/react-vite";
import type * as TypesGen from "api/typesGenerated";
import { expect, waitFor, within } from "storybook/test";
import { StreamingOutput } from "./ConversationTimeline";
import { applyMessagePartToStreamState, buildStreamTools } from "./streamState";
import type { RetryState, StreamState } from "./types";

// StreamingOutput renders inside a ConversationItem > Message > MessageContent
// chain, but it's self-contained enough to render standalone.

const buildStreamRenderState = (
	parts: readonly TypesGen.ChatMessagePart[],
): Pick<
	React.ComponentProps<typeof StreamingOutput>,
	"streamState" | "streamTools"
> => {
	let streamState: StreamState | null = null;
	for (const part of parts) {
		streamState = applyMessagePartToStreamState(
			streamState,
			part as unknown as Record<string, unknown>,
		);
	}
	return {
		streamState,
		streamTools: buildStreamTools(streamState),
	};
};

const buildRetryState = (overrides: Partial<RetryState> = {}): RetryState => ({
	attempt: 1,
	error:
		"Anthropic is retrying your request after a transient upstream failure.",
	kind: "generic",
	provider: "anthropic",
	delayMs: 2000,
	retryingAt: "2026-03-10T00:00:02.000Z",
	...overrides,
});

const resumedParts: TypesGen.ChatMessagePart[] = [
	{
		type: "text",
		text: "Successfully connected after retry. Here is your answer...",
	},
];

const meta: Meta<typeof StreamingOutput> = {
	title: "pages/AgentsPage/AgentDetail/StreamingOutput",
	component: StreamingOutput,
	decorators: [
		(Story) => (
			<div className="mx-auto w-full max-w-3xl py-6">
				<Story />
			</div>
		),
	],
};
export default meta;
type Story = StoryObj<typeof StreamingOutput>;

/** Default shimmer placeholder with no stream state. */
export const ThinkingPlaceholder: Story = {
	args: {
		streamState: null,
		streamTools: [],
		showInitialPlaceholder: true,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(canvas.getByText("Thinking...")).toBeVisible();
		expect(
			canvas.queryByRole("heading", { name: /retrying request/i }),
		).not.toBeInTheDocument();
	},
};

/** Generic retry reasons show the mux-style retry callout. */
export const RetryWithVisibleReason: Story = {
	args: {
		streamState: null,
		streamTools: [],
		showInitialPlaceholder: true,
		retryState: buildRetryState(),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(
			canvas.getByRole("heading", { name: /retrying request/i }),
		).toBeVisible();
		expect(canvas.getByText(/transient upstream failure/i)).toBeVisible();
		expect(canvas.getByText("generic")).toBeVisible();
		expect(canvas.getByText(/attempt 1/i)).toBeVisible();
	},
};

/** Rate-limited retries expose the normalized kind and delay metadata. */
export const RetryRateLimited: Story = {
	args: {
		streamState: null,
		streamTools: [],
		showInitialPlaceholder: true,
		retryState: buildRetryState({
			attempt: 3,
			error: "Anthropic asked us to back off briefly before retrying.",
			kind: "rate_limit",
			delayMs: 3000,
		}),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(
			canvas.getByRole("heading", { name: /rate limited/i }),
		).toBeVisible();
		expect(canvas.getByText("rate_limit")).toBeVisible();
		expect(canvas.getByText(/retrying in 3 seconds/i)).toBeVisible();
		expect(
			canvas.queryByRole("link", { name: /status/i }),
		).not.toBeInTheDocument();
	},
};

/** Retrying clears stale streamed content before rendering the callout. */
export const RetryAfterPartialStream: Story = {
	args: {
		streamState: null,
		streamTools: [],
		showInitialPlaceholder: true,
		retryState: buildRetryState({
			attempt: 2,
			error: "The provider dropped the connection. Retrying now.",
		}),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await waitFor(() => {
			expect(
				canvas.getByRole("heading", { name: /retrying request/i }),
			).toBeVisible();
		});
		expect(
			canvas.queryByText(/this partial answer should disappear/i),
		).not.toBeInTheDocument();
	},
};

/** Active streaming after a retry no longer shows the retry callout. */
export const StreamingAfterRetry: Story = {
	args: {
		...buildStreamRenderState(resumedParts),
		retryState: null,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(
			canvas.getByText(/successfully connected after retry/i),
		).toBeVisible();
		expect(
			canvas.queryByRole("heading", { name: /retrying request/i }),
		).not.toBeInTheDocument();
	},
};
