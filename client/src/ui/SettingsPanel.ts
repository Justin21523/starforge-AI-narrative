import { InputManager } from "../core/InputManager";
import { ToastManager } from "./Toast";
import { getAudioManager } from "../audio/AudioManager";
import { setLanguage, t, type Language } from "../i18n/i18n";

/**
 * Game settings that can be configured by the player
 */
export interface GameSettings {
  bgmVolume: number;      // 0-100
  sfxVolume: number;      // 0-100
  textSpeed: "slow" | "normal" | "fast";
  language: "en" | "zh";
  showHints: boolean;
  autoSave: boolean;
}

export const defaultSettings: GameSettings = {
  bgmVolume: 70,
  sfxVolume: 80,
  textSpeed: "normal",
  language: "en",
  showHints: true,
  autoSave: true,
};

type SettingKey = keyof GameSettings;

interface SettingOption {
  key: SettingKey;
  label: string;
  type: "slider" | "toggle" | "select";
  options?: { value: string; label: string }[];
}

interface SettingAction {
  key: string;
  label: string;
  type: "action";
  action: string;
}

function getSettingsOptions(): (SettingOption | SettingAction)[] {
  return [
    { key: "bgmVolume", label: t("settings_music_volume"), type: "slider" },
    { key: "sfxVolume", label: t("settings_sfx_volume"), type: "slider" },
    {
      key: "textSpeed",
      label: t("settings_text_speed"),
      type: "select",
      options: [
        { value: "slow", label: t("speed_slow") },
        { value: "normal", label: t("speed_normal") },
        { value: "fast", label: t("speed_fast") },
      ],
    },
    {
      key: "language",
      label: t("settings_language"),
      type: "select",
      options: [
        { value: "en", label: "English" },
        { value: "zh", label: "中文" },
      ],
    },
    { key: "showHints", label: t("settings_show_hints"), type: "toggle" },
    { key: "autoSave", label: t("settings_auto_save"), type: "toggle" },
    { key: "replayTutorial", label: t("settings_replay_tutorial"), type: "action", action: "replayTutorial" },
  ];
}

const STORAGE_KEY = "starforge_settings";

/**
 * Settings panel for game configuration.
 * Handles volume, language, and display options.
 */
export class SettingsPanel {
  private visible = false;
  private input: InputManager;
  private toast?: ToastManager;
  private settings: GameSettings;
  private selectedIndex = 0;
  private onClose: () => void;
  private onAction?: (action: string) => void;

  constructor(
    inputManager: InputManager,
    onClose: () => void,
    toastManager?: ToastManager,
    onAction?: (action: string) => void
  ) {
    this.input = inputManager;
    this.onClose = onClose;
    this.toast = toastManager;
    this.onAction = onAction;
    this.settings = this.loadSettings();
  }

  private loadSettings(): GameSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch {
      // Use defaults on error
    }
    return { ...defaultSettings };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      console.warn("Failed to save settings");
    }
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  show(): void {
    this.visible = true;
    this.selectedIndex = 0;
  }

  hide(): void {
    this.visible = false;
    this.saveSettings();
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(): void {
    if (!this.visible) return;

    // Navigate options
    if (this.input.consumePress("ArrowUp")) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    }
    if (this.input.consumePress("ArrowDown")) {
      this.selectedIndex = Math.min(
        getSettingsOptions().length - 1,
        this.selectedIndex + 1
      );
    }

    // Adjust value
    const option = getSettingsOptions()[this.selectedIndex];
    if (option.type === "slider") {
      if (this.input.consumePress("ArrowLeft")) {
        this.adjustSlider(option.key, -10);
      }
      if (this.input.consumePress("ArrowRight")) {
        this.adjustSlider(option.key, 10);
      }
    } else if (option.type === "toggle") {
      if (
        this.input.consumePress("ArrowLeft") ||
        this.input.consumePress("ArrowRight") ||
        this.input.consumePress("Enter")
      ) {
        this.toggleSetting(option.key);
      }
    } else if (option.type === "select") {
      if (this.input.consumePress("ArrowLeft")) {
        this.cycleSelect(option.key, option.options!, -1);
      }
      if (this.input.consumePress("ArrowRight") || this.input.consumePress("Enter")) {
        this.cycleSelect(option.key, option.options!, 1);
      }
    } else if (option.type === "action") {
      if (this.input.consumePress("Enter")) {
        this.executeAction((option as SettingAction).action);
      }
    }

    // Close with Escape
    if (this.input.consumePress("Escape")) {
      this.saveSettings();
      this.hide();
      this.onClose();
    }
  }

  private adjustSlider(key: SettingKey, delta: number): void {
    const current = this.settings[key] as number;
    const newValue = Math.max(0, Math.min(100, current + delta));
    (this.settings as Record<string, unknown>)[key] = newValue;

    // Update audio manager when volume changes
    const audio = getAudioManager();
    if (key === "bgmVolume") {
      audio.setBgmVolume(newValue);
    } else if (key === "sfxVolume") {
      audio.setSfxVolume(newValue);
      // Play a test sound so user can hear the change
      audio.playSfx("menu_select");
    }
  }

  private toggleSetting(key: SettingKey): void {
    const current = this.settings[key] as boolean;
    (this.settings as Record<string, unknown>)[key] = !current;
  }

  private cycleSelect(
    key: SettingKey,
    options: { value: string; label: string }[],
    direction: number
  ): void {
    const current = this.settings[key] as string;
    const currentIndex = options.findIndex((o) => o.value === current);
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = options.length - 1;
    if (newIndex >= options.length) newIndex = 0;
    const newValue = options[newIndex].value;
    (this.settings as Record<string, unknown>)[key] = newValue;

    // Update language when changed
    if (key === "language") {
      setLanguage(newValue as Language);
    }
  }

  private executeAction(action: string): void {
    if (this.onAction) {
      this.onAction(action);
      this.hide();
      this.onClose();
    } else {
      this.toast?.add(`Action: ${action}`);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const { width, height } = ctx.canvas;
    ctx.save();

    // Dim background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, width, height);

    // Panel
    const panelWidth = 420;
    const panelHeight = 380;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    // Panel background
    ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = "#f0f4f8";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(t("settings_title"), width / 2, panelY + 40);

    // Settings options
    const startY = panelY + 80;
    const rowHeight = 45;

    getSettingsOptions().forEach((option, index) => {
      const y = startY + index * rowHeight;
      const isSelected = index === this.selectedIndex;

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
        ctx.fillRect(panelX + 15, y - 8, panelWidth - 30, 38);
      }

      // Label
      ctx.font = isSelected ? "bold 16px Arial" : "16px Arial";
      ctx.fillStyle = isSelected ? "#38bdf8" : "#e2e8f0";
      ctx.textAlign = "left";
      ctx.fillText(option.label, panelX + 30, y + 16);

      // Value
      ctx.textAlign = "right";
      this.renderSettingValue(ctx, option, panelX + panelWidth - 30, y + 16, isSelected);
    });

    // Controls hint
    ctx.font = "12px Arial";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.fillText(
      t("settings_controls"),
      width / 2,
      panelY + panelHeight - 20
    );

    ctx.restore();
  }

  private renderSettingValue(
    ctx: CanvasRenderingContext2D,
    option: SettingOption | SettingAction,
    x: number,
    y: number,
    isSelected: boolean
  ): void {
    if (option.type === "action") {
      // Render action as button-like text
      ctx.fillStyle = isSelected ? "#fbbf24" : "#94a3b8";
      ctx.font = isSelected ? "bold 14px Arial" : "14px Arial";
      ctx.fillText("[Enter]", x, y);
      return;
    }

    const value = this.settings[option.key];

    if (option.type === "slider") {
      // Slider bar
      const barWidth = 120;
      const barHeight = 8;
      const barX = x - barWidth;
      const barY = y - 4;
      const fillWidth = (value as number / 100) * barWidth;

      // Background
      ctx.fillStyle = "#334155";
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Fill
      ctx.fillStyle = isSelected ? "#38bdf8" : "#64748b";
      ctx.fillRect(barX, barY, fillWidth, barHeight);

      // Value text
      ctx.fillStyle = isSelected ? "#38bdf8" : "#94a3b8";
      ctx.font = "14px Arial";
      ctx.fillText(`${value}%`, barX - 10, y);
    } else if (option.type === "toggle") {
      const isOn = value as boolean;
      ctx.fillStyle = isOn
        ? isSelected ? "#38bdf8" : "#22c55e"
        : isSelected ? "#f87171" : "#64748b";
      ctx.font = "bold 14px Arial";
      ctx.fillText(isOn ? t("on") : t("off"), x, y);
    } else if (option.type === "select") {
      const currentOption = option.options?.find((o) => o.value === value);
      ctx.fillStyle = isSelected ? "#38bdf8" : "#94a3b8";
      ctx.font = "14px Arial";
      ctx.fillText(`< ${currentOption?.label || value} >`, x, y);
    }
  }
}

/**
 * Load settings from localStorage
 */
export function loadGameSettings(): GameSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Use defaults
  }
  return { ...defaultSettings };
}
