import { InputManager } from "../core/InputManager";
import { t } from "../i18n/i18n";

import type { TranslationSet } from "../i18n/i18n";

/**
 * Tutorial step definition
 */
export interface TutorialStep {
  id: string;
  titleKey: keyof TranslationSet;
  messageKey: keyof TranslationSet;
  highlight?: {
    type: "key" | "area" | "element";
    keys?: string[];
    area?: { x: number; y: number; width: number; height: number };
  };
  waitForKey?: string;
  autoAdvanceDelay?: number;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    titleKey: "tutorial_welcome_title",
    messageKey: "tutorial_welcome_msg",
    autoAdvanceDelay: 3,
  },
  {
    id: "movement",
    titleKey: "tutorial_movement_title",
    messageKey: "tutorial_movement_msg",
    highlight: { type: "key", keys: ["←", "→"] },
    waitForKey: "ArrowLeft",
  },
  {
    id: "talk_npc",
    titleKey: "tutorial_talk_title",
    messageKey: "tutorial_talk_msg",
    highlight: { type: "key", keys: ["E"] },
    waitForKey: "KeyE",
  },
  {
    id: "dialogue",
    titleKey: "tutorial_dialogue_title",
    messageKey: "tutorial_dialogue_msg",
    highlight: { type: "key", keys: ["↑", "↓", "Enter"] },
  },
  {
    id: "scene_nav",
    titleKey: "tutorial_scene_title",
    messageKey: "tutorial_scene_msg",
    highlight: { type: "key", keys: ["N"] },
  },
  {
    id: "pause_menu",
    titleKey: "tutorial_pause_title",
    messageKey: "tutorial_pause_msg",
    highlight: { type: "key", keys: ["Esc"] },
  },
  {
    id: "quests",
    titleKey: "tutorial_quest_title",
    messageKey: "tutorial_quest_msg",
    highlight: { type: "area", area: { x: -200, y: 0, width: 180, height: 200 } },
  },
  {
    id: "stats",
    titleKey: "tutorial_stats_title",
    messageKey: "tutorial_stats_msg",
  },
  {
    id: "complete",
    titleKey: "tutorial_complete_title",
    messageKey: "tutorial_complete_msg",
    autoAdvanceDelay: 4,
  },
];

const STORAGE_KEY = "starforge_tutorial_complete";

/**
 * TutorialManager handles the new player tutorial experience.
 * Shows step-by-step guidance through game controls and mechanics.
 */
export class TutorialManager {
  private active = false;
  private currentStepIndex = 0;
  private input: InputManager;
  private onComplete: () => void;
  private stepTimer = 0;
  private fadeAlpha = 0;
  private fadeIn = true;

  constructor(inputManager: InputManager, onComplete: () => void) {
    this.input = inputManager;
    this.onComplete = onComplete;
  }

  /**
   * Check if tutorial has been completed before
   */
  static isCompleted(): boolean {
    return localStorage.getItem(STORAGE_KEY) === "true";
  }

  /**
   * Mark tutorial as completed
   */
  static markCompleted(): void {
    localStorage.setItem(STORAGE_KEY, "true");
  }

  /**
   * Reset tutorial completion (for replay)
   */
  static reset(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Start the tutorial from the beginning
   */
  start(): void {
    this.active = true;
    this.currentStepIndex = 0;
    this.stepTimer = 0;
    this.fadeAlpha = 0;
    this.fadeIn = true;
  }

  /**
   * Skip the entire tutorial
   */
  skip(): void {
    this.active = false;
    TutorialManager.markCompleted();
    this.onComplete();
  }

  isActive(): boolean {
    return this.active;
  }

  getCurrentStep(): TutorialStep | null {
    if (!this.active) return null;
    return TUTORIAL_STEPS[this.currentStepIndex] || null;
  }

  update(delta: number): void {
    if (!this.active) return;

    // Fade in animation
    if (this.fadeIn && this.fadeAlpha < 1) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + delta * 3);
    }

    const step = this.getCurrentStep();
    if (!step) {
      this.complete();
      return;
    }

    // Auto-advance timer
    if (step.autoAdvanceDelay) {
      this.stepTimer += delta;
      if (this.stepTimer >= step.autoAdvanceDelay) {
        this.nextStep();
        return;
      }
    }

    // Wait for specific key
    if (step.waitForKey) {
      if (this.input.consumePress(step.waitForKey)) {
        this.nextStep();
        return;
      }
    }

    // Advance with Enter or Space (if no specific key required)
    if (!step.waitForKey && !step.autoAdvanceDelay) {
      if (this.input.consumePress("Enter") || this.input.consumePress("Space")) {
        this.nextStep();
        return;
      }
    }

    // Skip with Escape
    if (this.input.consumePress("Escape")) {
      this.skip();
    }
  }

  private nextStep(): void {
    this.currentStepIndex++;
    this.stepTimer = 0;
    this.fadeAlpha = 0;
    this.fadeIn = true;

    if (this.currentStepIndex >= TUTORIAL_STEPS.length) {
      this.complete();
    }
  }

  private complete(): void {
    this.active = false;
    TutorialManager.markCompleted();
    this.onComplete();
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const { width, height } = ctx.canvas;
    const step = this.getCurrentStep();
    if (!step) return;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    // Dim background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, width, height);

    // Tutorial panel
    const panelWidth = 450;
    const panelHeight = 200;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    // Panel background
    ctx.fillStyle = "rgba(30, 58, 95, 0.95)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border (gold for tutorial)
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Step indicator
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(
      `Step ${this.currentStepIndex + 1} of ${TUTORIAL_STEPS.length}`,
      panelX + 20,
      panelY + 25
    );

    // Skip hint
    ctx.textAlign = "right";
    ctx.fillText(t("tutorial_skip"), panelX + panelWidth - 20, panelY + 25);

    // Title
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText(t(step.titleKey), width / 2, panelY + 60);

    // Message
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "16px Arial";
    this.wrapText(ctx, t(step.messageKey), width / 2, panelY + 95, panelWidth - 40, 24);

    // Key highlights
    if (step.highlight?.type === "key" && step.highlight.keys) {
      this.renderKeyHighlight(ctx, step.highlight.keys, width / 2, panelY + 155);
    }

    // Progress bar or continue hint
    if (step.autoAdvanceDelay) {
      const progress = this.stepTimer / step.autoAdvanceDelay;
      const barWidth = panelWidth - 40;
      const barX = panelX + 20;
      const barY = panelY + panelHeight - 25;

      ctx.fillStyle = "#334155";
      ctx.fillRect(barX, barY, barWidth, 6);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(barX, barY, barWidth * progress, 6);
    } else if (!step.waitForKey) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px Arial";
      ctx.fillText(t("tutorial_continue"), width / 2, panelY + panelHeight - 15);
    } else {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "14px Arial";
      ctx.fillText(t("tutorial_press_key"), width / 2, panelY + panelHeight - 15);
    }

    ctx.restore();
  }

  private renderKeyHighlight(
    ctx: CanvasRenderingContext2D,
    keys: string[],
    centerX: number,
    y: number
  ): void {
    const keyWidth = 50;
    const keyHeight = 40;
    const gap = 10;
    const totalWidth = keys.length * keyWidth + (keys.length - 1) * gap;
    let x = centerX - totalWidth / 2;

    keys.forEach((key) => {
      // Key background
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x, y - keyHeight / 2, keyWidth, keyHeight);

      // Key border
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y - keyHeight / 2, keyWidth, keyHeight);

      // Key text
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(key, x + keyWidth / 2, y + 6);

      x += keyWidth + gap;
    });
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + " ";
      if (ctx.measureText(testLine).width > maxWidth && line !== "") {
        ctx.fillText(line.trim(), x, currentY);
        line = word + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  }
}
