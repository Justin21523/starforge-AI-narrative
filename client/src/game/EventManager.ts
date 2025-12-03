import { appStore } from "../state/store";

/**
 * Event definition from data files
 */
export interface GameEvent {
  id: string;
  title: string;
  type: "random" | "conditional" | "story";
  trigger: {
    scenes: string[];
    probability: number;
    conditions?: EventCondition[];
  };
  description: string;
  choices: EventChoice[];
}

export interface EventCondition {
  type: "questComplete" | "stat" | "relationship" | "questActive";
  questId?: string;
  npcId?: string;
  stat?: string;
  op?: ">=" | "<=" | "==" | ">";
  value?: number;
}

export interface EventChoice {
  id: string;
  text: string;
  effects: {
    stats?: Record<string, number>;
    relationship?: Record<string, number>;
  };
  followUp: string;
}

/**
 * EventManager handles random and conditional events during gameplay.
 * Checks triggers, evaluates conditions, and presents choices to players.
 */
export class EventManager {
  private events: GameEvent[] = [];
  private triggeredEventIds: Set<string> = new Set();
  private cooldownEvents: Map<string, number> = new Map();
  private currentEvent: GameEvent | null = null;
  private selectedChoiceIndex = 0;
  private showingResult = false;
  private resultText = "";

  private readonly COOLDOWN_MS = 60000; // 1 minute cooldown per event

  loadEvents(events: GameEvent[]): void {
    this.events = events;
  }

  /**
   * Check if any event should trigger for the current scene
   */
  checkForEvents(sceneId: string): GameEvent | null {
    if (this.currentEvent) return null;

    const now = Date.now();
    const state = appStore.getState();

    for (const event of this.events) {
      // Check if event is on cooldown
      const lastTriggered = this.cooldownEvents.get(event.id);
      if (lastTriggered && now - lastTriggered < this.COOLDOWN_MS) {
        continue;
      }

      // Check if scene matches
      if (!event.trigger.scenes.includes(sceneId)) {
        continue;
      }

      // Check conditions
      if (!this.evaluateConditions(event.trigger.conditions || [], state)) {
        continue;
      }

      // Roll probability
      if (Math.random() > event.trigger.probability) {
        continue;
      }

      // Event triggers!
      this.cooldownEvents.set(event.id, now);
      return event;
    }

    return null;
  }

  private evaluateConditions(
    conditions: EventCondition[],
    state: ReturnType<typeof appStore.getState>
  ): boolean {
    for (const condition of conditions) {
      switch (condition.type) {
        case "questComplete": {
          const questState = state.game.questStates[condition.questId!];
          if (questState !== "completed") return false;
          break;
        }
        case "questActive": {
          const questState = state.game.questStates[condition.questId!];
          if (questState !== "active") return false;
          break;
        }
        case "stat": {
          const statValue = (state.game.player as Record<string, number>)[condition.stat!] || 0;
          if (!this.compareValue(statValue, condition.op!, condition.value!)) {
            return false;
          }
          break;
        }
        case "relationship": {
          // Would need to track NPC relationships in state
          // For now, use friendship from current NPC if it matches
          if (state.game.npc.id === condition.npcId) {
            const value = state.game.npc.friendship;
            if (!this.compareValue(value, condition.op!, condition.value!)) {
              return false;
            }
          }
          break;
        }
      }
    }
    return true;
  }

  private compareValue(actual: number, op: string, expected: number): boolean {
    switch (op) {
      case ">=": return actual >= expected;
      case "<=": return actual <= expected;
      case "==": return actual === expected;
      case ">": return actual > expected;
      default: return false;
    }
  }

  /**
   * Start showing an event
   */
  triggerEvent(event: GameEvent): void {
    this.currentEvent = event;
    this.selectedChoiceIndex = 0;
    this.showingResult = false;
    this.resultText = "";
  }

  /**
   * Check if an event is currently active
   */
  isEventActive(): boolean {
    return this.currentEvent !== null;
  }

  /**
   * Get the current event
   */
  getCurrentEvent(): GameEvent | null {
    return this.currentEvent;
  }

  /**
   * Navigate choice selection
   */
  navigateUp(): void {
    if (this.showingResult || !this.currentEvent) return;
    this.selectedChoiceIndex = Math.max(0, this.selectedChoiceIndex - 1);
  }

  navigateDown(): void {
    if (this.showingResult || !this.currentEvent) return;
    const maxIndex = this.currentEvent.choices.length - 1;
    this.selectedChoiceIndex = Math.min(maxIndex, this.selectedChoiceIndex + 1);
  }

  getSelectedIndex(): number {
    return this.selectedChoiceIndex;
  }

  isShowingResult(): boolean {
    return this.showingResult;
  }

  getResultText(): string {
    return this.resultText;
  }

  /**
   * Select the current choice and apply effects
   */
  selectChoice(): void {
    if (!this.currentEvent || this.showingResult) return;

    const choice = this.currentEvent.choices[this.selectedChoiceIndex];

    // Apply stat effects
    if (choice.effects.stats) {
      const currentStats = appStore.getState().game.player;
      appStore.updatePlayerStats({
        confidence: currentStats.confidence + (choice.effects.stats.confidence || 0),
        empathy: currentStats.empathy + (choice.effects.stats.empathy || 0),
        stress: currentStats.stress + (choice.effects.stats.stress || 0),
        reputation: currentStats.reputation + (choice.effects.stats.reputation || 0),
      });
    }

    // Apply relationship effects (simplified - would need full NPC tracking)
    if (choice.effects.relationship) {
      const currentNpc = appStore.getState().game.npc;
      const npcEffect = choice.effects.relationship[currentNpc.id];
      if (npcEffect) {
        appStore.updateNpcStats({
          ...currentNpc,
          friendship: currentNpc.friendship + npcEffect,
        });
      }
    }

    this.resultText = choice.followUp;
    this.showingResult = true;
  }

  /**
   * Dismiss the result and close the event
   */
  dismissEvent(): void {
    this.currentEvent = null;
    this.showingResult = false;
    this.resultText = "";
    this.selectedChoiceIndex = 0;
  }

  /**
   * Render the event overlay
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.currentEvent) return;

    const { width, height } = ctx.canvas;
    ctx.save();

    // Dim background
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, width, height);

    // Event panel
    const panelWidth = Math.min(500, width - 60);
    const panelHeight = 300;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    // Panel background
    ctx.fillStyle = "rgba(30, 58, 95, 0.95)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border
    ctx.strokeStyle = "#4a9eff";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Event title
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.currentEvent.title, width / 2, panelY + 35);

    if (this.showingResult) {
      this.renderResult(ctx, panelX, panelY, panelWidth, panelHeight);
    } else {
      this.renderChoices(ctx, panelX, panelY, panelWidth, panelHeight);
    }

    ctx.restore();
  }

  private renderChoices(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    panelWidth: number,
    panelHeight: number
  ): void {
    if (!this.currentEvent) return;

    // Description
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";

    this.wrapText(
      ctx,
      this.currentEvent.description,
      panelX + 20,
      panelY + 70,
      panelWidth - 40,
      22
    );

    // Choices
    const choiceStartY = panelY + 140;
    const choiceSpacing = 40;

    this.currentEvent.choices.forEach((choice, index) => {
      const y = choiceStartY + index * choiceSpacing;
      const isSelected = index === this.selectedChoiceIndex;

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = "rgba(74, 158, 255, 0.3)";
        ctx.fillRect(panelX + 15, y - 12, panelWidth - 30, 32);
      }

      // Choice text
      ctx.font = isSelected ? "bold 15px Arial" : "15px Arial";
      ctx.fillStyle = isSelected ? "#4a9eff" : "#cbd5e1";
      ctx.textAlign = "left";
      ctx.fillText(`> ${choice.text}`, panelX + 25, y + 8);
    });

    // Controls hint
    ctx.font = "12px Arial";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText(
      "[↑↓] Choose  [Enter] Select",
      panelX + panelWidth / 2,
      panelY + panelHeight - 15
    );
  }

  private renderResult(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    panelWidth: number,
    panelHeight: number
  ): void {
    // Result text
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";

    this.wrapText(
      ctx,
      this.resultText,
      panelX + 20,
      panelY + 80,
      panelWidth - 40,
      24
    );

    // Continue hint
    ctx.font = "14px Arial";
    ctx.fillStyle = "#4a9eff";
    ctx.textAlign = "center";
    ctx.fillText(
      "Press [Enter] to continue",
      panelX + panelWidth / 2,
      panelY + panelHeight - 30
    );
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
