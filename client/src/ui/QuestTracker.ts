import type { QuestDef } from "../types/dataTypes";

type QuestTrackerOptions = {
  x: number;
  y: number;
  width: number;
  maxQuests?: number;
};

export class QuestTracker {
  private quests: QuestDef[] = [];
  private questStates: Record<string, string> = {};
  private visible = true;
  private highlightedQuestId: string | null = null;
  private highlightTimer = 0;

  constructor(private readonly options: QuestTrackerOptions) {}

  setQuests(quests: QuestDef[], questStates: Record<string, string>): void {
    this.quests = quests;
    this.questStates = questStates;
  }

  highlightQuest(questId: string): void {
    this.highlightedQuestId = questId;
    this.highlightTimer = 2.4;
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  update(delta: number): void {
    if (this.highlightTimer <= 0) {
      this.highlightedQuestId = null;
      return;
    }
    this.highlightTimer = Math.max(0, this.highlightTimer - delta);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const activeQuests = this.visibleQuests();
    const rowHeight = 54;
    const padding = 12;
    const height = padding * 2 + 26 + activeQuests.length * rowHeight;
    const { x, y, width } = this.options;

    ctx.save();
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.fillStyle = "rgba(12, 18, 32, 0.78)";
    ctx.fill();
    ctx.strokeStyle = "rgba(129, 140, 248, 0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 15px system-ui, sans-serif";
    ctx.fillText("Quest Tracker", x + padding, y + 22);

    if (activeQuests.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText("No active quests", x + padding, y + 48);
      ctx.restore();
      return;
    }

    activeQuests.forEach((quest, index) => {
      const top = y + 36 + index * rowHeight;
      const isHighlighted = quest.id === this.highlightedQuestId && this.highlightTimer > 0;
      if (isHighlighted) {
        ctx.fillStyle = `rgba(250, 204, 21, ${0.16 + Math.sin(this.highlightTimer * 8) * 0.06})`;
        this.roundRect(ctx, x + 8, top - 4, width - 16, rowHeight - 6, 8);
        ctx.fill();
      }

      ctx.fillStyle = quest.type === "main" ? "#38bdf8" : "#a78bfa";
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.fillText(quest.type.toUpperCase(), x + padding, top + 12);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 13px system-ui, sans-serif";
      ctx.fillText(this.truncate(quest.title, 28), x + padding, top + 29);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(this.truncate(this.currentStepLabel(quest), 34), x + padding, top + 46);
    });

    ctx.restore();
  }

  private visibleQuests(): QuestDef[] {
    const limit = this.options.maxQuests ?? 3;
    return this.quests
      .filter((quest) => this.questStates[quest.id] !== "completed")
      .slice(0, limit);
  }

  private currentStepLabel(quest: QuestDef): string {
    const state = this.questStates[quest.id] || "not_started";
    return quest.steps.find((step) => step.id === state)?.description ?? state.replace(/_/g, " ");
  }

  private truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
