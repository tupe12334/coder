import { Alert, AlertDescription, AlertTitle } from "components/Alert/Alert";
import { Response, Shimmer } from "components/ai-elements";
import { Button } from "components/Button/Button";
import { Pill } from "components/Pill/Pill";
import { ExternalLinkIcon } from "lucide-react";
import type { FC } from "react";
import { formatRetryDelay, getProviderStatusURL } from "./chatStatusHelpers";
import type { LiveStatusModel } from "./liveStatusModel";

const DELAYED_STARTUP_TEXT = "Response startup is taking longer than expected";
const THINKING_TEXT = "Thinking...";

type AlertStatus = Extract<
	LiveStatusModel,
	{ phase: "retrying" } | { phase: "failed" }
>;

const StatusPlaceholder: FC<{
	text: string;
	shimmer?: boolean;
	attempt?: number;
}> = ({ text, shimmer = false, attempt }) => {
	const placeholderText =
		attempt !== undefined ? `${text} attempt ${attempt}` : text;

	return (
		<div className="relative">
			<Response aria-hidden className="invisible">
				{placeholderText}
			</Response>
			<div className="pointer-events-none absolute inset-0 flex items-baseline gap-2">
				{shimmer ? (
					<Shimmer as="div" className="text-[13px] leading-relaxed">
						{text}
					</Shimmer>
				) : (
					<span className="text-[13px] leading-relaxed text-content-secondary">
						{text}
					</span>
				)}
				{attempt !== undefined && (
					<span className="text-[11px] text-content-secondary">
						attempt {attempt}
					</span>
				)}
			</div>
		</div>
	);
};

const StatusAlert: FC<{ status: AlertStatus }> = ({ status }) => {
	const statusURL = getProviderStatusURL(status.kind, status.provider);
	const retryDelay =
		status.phase === "retrying" ? formatRetryDelay(status.delayMs) : null;
	const metadata = [
		...(status.phase === "retrying" ? [`Attempt ${status.attempt}`] : []),
		...(retryDelay ? [`Retrying in ${retryDelay}`] : []),
		...(status.provider ? [`Provider ${status.provider}`] : []),
		...(status.phase === "failed" && status.statusCode !== undefined
			? [`HTTP ${status.statusCode}`]
			: []),
		...(status.phase === "failed" && status.retryable !== undefined
			? [status.retryable ? "Retryable" : "Not retryable"]
			: []),
	];
	const pillType =
		status.phase === "failed"
			? "error"
			: status.kind === "generic"
				? "inactive"
				: "warning";
	const severity =
		status.phase === "failed"
			? "error"
			: status.kind === "generic"
				? "info"
				: "warning";

	return (
		<Alert
			severity={severity}
			className="py-3"
			actions={
				statusURL && (
					<Button asChild variant="subtle" size="sm">
						<a href={statusURL} target="_blank" rel="noreferrer">
							Status
							<ExternalLinkIcon />
						</a>
					</Button>
				)
			}
		>
			<div className="space-y-2.5">
				<div className="flex flex-wrap items-center gap-2">
					<AlertTitle>{status.title}</AlertTitle>
					<Pill
						className="h-5 px-2.5 text-[10px] font-semibold"
						type={pillType}
					>
						{status.kind}
					</Pill>
				</div>
				<AlertDescription>{status.message}</AlertDescription>
				{metadata.length > 0 && (
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-secondary">
						{metadata.map((item) => (
							<span key={item}>{item}</span>
						))}
					</div>
				)}
			</div>
		</Alert>
	);
};

export const ChatStatusCallout: FC<{ status: LiveStatusModel }> = ({
	status,
}) => {
	switch (status.phase) {
		case "idle":
		case "streaming":
			return null;
		case "starting":
			return <StatusPlaceholder text={THINKING_TEXT} shimmer />;
		case "delayed_start":
			return <StatusPlaceholder text={DELAYED_STARTUP_TEXT} />;
		case "retrying":
			return (
				<>
					<StatusAlert status={status} />
					<StatusPlaceholder
						text={THINKING_TEXT}
						shimmer
						attempt={status.attempt}
					/>
				</>
			);
		case "failed":
			return <StatusAlert status={status} />;
	}
};
