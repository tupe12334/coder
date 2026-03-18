import { MockUserOwner } from "testHelpers/entities";
import { withAuthProvider, withDashboardProvider } from "testHelpers/storybook";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { API } from "api/api";
import dayjs from "dayjs";
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test";
import { SettingsPageContent } from "./SettingsPageContent";

const meta = {
	title: "pages/AgentsPage/SettingsPageContent",
	component: SettingsPageContent,
	decorators: [withAuthProvider, withDashboardProvider],
	args: {
		activeSection: "behavior",
		canManageChatModelConfigs: false,
		canSetSystemPrompt: true,
		now: dayjs("2026-03-12T00:00:00Z"),
	},
	parameters: {
		user: MockUserOwner,
		layout: "fullscreen",
	},
	beforeEach: () => {
		spyOn(API, "getChatSystemPrompt").mockResolvedValue({
			system_prompt: "",
		});
		spyOn(API, "updateChatSystemPrompt").mockResolvedValue();
		spyOn(API, "getChatDesktopEnabled").mockResolvedValue({
			enable_desktop: false,
		});
		spyOn(API, "updateChatDesktopEnabled").mockResolvedValue();
		spyOn(API, "getUserChatCustomPrompt").mockResolvedValue({
			custom_prompt: "",
		});
		spyOn(API, "updateUserChatCustomPrompt").mockResolvedValue({
			custom_prompt: "",
		});
		spyOn(API, "getChatWorkspaceTTL").mockResolvedValue({
			workspace_ttl: "1h0m0s",
		});
		spyOn(API, "updateChatWorkspaceTTL").mockResolvedValue();
	},
} satisfies Meta<typeof SettingsPageContent>;

export default meta;
type Story = StoryObj<typeof SettingsPageContent>;

export const DesktopSetting: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await canvas.findByText("Virtual Desktop");
		await canvas.findByText(
			/Allow agents to use a virtual, graphical desktop/i,
		);
		await canvas.findByRole("switch", { name: "Enable" });
	},
};

export const TogglesDesktop: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const toggle = await canvas.findByRole("switch", {
			name: "Enable",
		});

		await userEvent.click(toggle);
		await waitFor(() => {
			expect(API.updateChatDesktopEnabled).toHaveBeenCalledWith({
				enable_desktop: true,
			});
		});
	},
};

export const DefaultAutostopDefault: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await canvas.findByText("Default Autostop");
		await canvas.findByText(/Time until chat workspaces are stopped/i);

		// DurationField renders a text input labeled "Default autostop".
		const durationInput = await canvas.findByLabelText("Default autostop");

		// Default is "1h0m0s" → 1 hour.
		expect(durationInput).toHaveValue("1");

		// Save button in the Workspace Lifetime form should be disabled.
		const ttlForm = durationInput.closest("form")!;
		const saveButton = within(ttlForm).getByRole("button", { name: "Save" });
		expect(saveButton).toBeDisabled();
	},
};

export const DefaultAutostopCustomValue: Story = {
	beforeEach: () => {
		// 2h = 2 hours exactly, shows cleanly in DurationField.
		spyOn(API, "getChatWorkspaceTTL").mockResolvedValue({
			workspace_ttl: "2h0m0s",
		});
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const durationInput = await canvas.findByLabelText("Default autostop");

		// Shows 2 hours from the mock.
		expect(durationInput).toHaveValue("2");
	},
};

export const DefaultAutostopSave: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const durationInput = await canvas.findByLabelText("Default autostop");
		const ttlForm = durationInput.closest("form")!;
		const saveButton = within(ttlForm).getByRole("button", { name: "Save" });

		// Change to 3 hours.
		await userEvent.clear(durationInput);
		await userEvent.type(durationInput, "3");

		// Save button should now be enabled.
		await waitFor(() => {
			expect(saveButton).toBeEnabled();
		});

		await userEvent.click(saveButton);
		await waitFor(() => {
			expect(API.updateChatWorkspaceTTL).toHaveBeenCalledWith({
				workspace_ttl: "3h0m",
			});
		});
	},
};

export const DefaultAutostopNotVisibleToNonAdmin: Story = {
	args: {
		canSetSystemPrompt: false,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Personal Instructions should be visible.
		await canvas.findByText("Personal Instructions");

		// Admin-only sections should not be present.
		const ttlHeading = canvas.queryByText("Default Autostop");
		expect(ttlHeading).toBeNull();

		const desktopHeading = canvas.queryByText("Virtual Desktop");
		expect(desktopHeading).toBeNull();
	},
};
