import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, within } from "storybook/test";
import { StreamingOutput } from "./ConversationTimeline";
import {
	buildLiveStatus,
	buildRetryState,
	buildStreamRenderState,
	textResponseStreamParts,
} from "./storyFixtures";

// StreamingOutput renders inside a ConversationItem > Message > MessageContent
// chain, but it's self-contained enough to render standalone.

// StatusPlaceholder renders text twice (invisible spacer + visible node).
// This helper skips the aria-hidden duplicate so assertions stay unique.
const visibleByText = (
	canvas: ReturnType<typeof within>,
	text: string | RegExp,
) => {
	const matches = canvas.getAllByText(text);
	const visible = matches.find(
		(el: HTMLElement) => !el.closest("[aria-hidden]"),
	);
	if (!visible) throw new Error(`No visible element found with text: ${text}`);
	return visible;
};

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
		liveStatus: buildLiveStatus({ isAwaitingFirstStreamChunk: true }),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(visibleByText(canvas, "Thinking...")).toBeVisible();
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
		liveStatus: buildLiveStatus({
			retryState: buildRetryState(),
			isAwaitingFirstStreamChunk: true,
		}),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(
			canvas.getByRole("heading", { name: /retrying request/i }),
		).toBeVisible();
		expect(canvas.getByText(/transient upstream failure/i)).toBeVisible();
		expect(canvas.getByText("generic")).toBeVisible();
		expect(visibleByText(canvas, /attempt 1/i)).toBeVisible();
	},
};

/** Rate-limited retries expose the normalized kind and delay metadata. */
export const RetryRateLimited: Story = {
	args: {
		streamState: null,
		streamTools: [],
		liveStatus: buildLiveStatus({
			retryState: buildRetryState({
				attempt: 3,
				error: "Anthropic asked us to back off briefly before retrying.",
				kind: "rate_limit",
				delayMs: 3000,
			}),
			isAwaitingFirstStreamChunk: true,
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

/** Overloaded retries expose provider status links while retrying. */
export const RetryOverloaded: Story = {
	args: {
		streamState: null,
		streamTools: [],
		liveStatus: buildLiveStatus({
			retryState: buildRetryState({
				kind: "overloaded",
				provider: "anthropic",
				error: "Anthropic is currently overloaded. Retrying your request.",
			}),
			isAwaitingFirstStreamChunk: true,
		}),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(
			canvas.getByRole("heading", { name: /service overloaded/i }),
		).toBeVisible();
		expect(canvas.getByText("overloaded")).toBeVisible();
		const statusLink = screen.getByRole("link", { name: /status/i });
		expect(statusLink).toBeVisible();
		expect(statusLink).toHaveAttribute("href", "https://status.anthropic.com");
	},
};

/** Timeout retries render the timeout-specific heading without a status CTA. */
export const RetryTimeout: Story = {
	args: {
		streamState: null,
		streamTools: [],
		liveStatus: buildLiveStatus({
			retryState: buildRetryState({
				kind: "timeout",
				error: "The provider took too long to respond. Retrying now.",
			}),
			isAwaitingFirstStreamChunk: true,
		}),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(
			canvas.getByRole("heading", { name: /request time(?:out|d out)/i }),
		).toBeVisible();
		expect(canvas.getByText("timeout")).toBeVisible();
		expect(
			canvas.queryByRole("link", { name: /status/i }),
		).not.toBeInTheDocument();
	},
};

/** Active streaming after a retry no longer shows the retry callout. */
export const StreamingAfterRetry: Story = {
	args: {
		...buildStreamRenderState(textResponseStreamParts),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(await canvas.findByText(/storybook streamed answer/i)).toBeVisible();
		expect(
			canvas.queryByRole("heading", { name: /retrying request/i }),
		).not.toBeInTheDocument();
	},
};
