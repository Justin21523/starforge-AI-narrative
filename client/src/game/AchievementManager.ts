import { appStore } from "../state/store";

/**
 * Achievement definition from data files
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  reward: Record<string, number>;
}

export interface AchievementCondition {
  type: "questComplete" | "stat" | "counter" | "relationship";
  questId?: string;
  stat?: string;
  counter?: string;
  npcId?: string;
  op?: ">=" | "<=" | "==" | ">";
  value?: number;
}

interface AchievementNotification {
  achievement: Achievement;
  displayUntil: number;
}

/**
 * AchievementManager tracks player progress and unlocks achievements.
 * Displays notifications when achievements are earned.
 */
export class AchievementManager {
  private achievements: Achievement[] = [];
  private unlockedIds: Set<string> = new Set();
  private counters: Map<string, number> = new Map();
  private notifications: AchievementNotification[] = [];

  private readonly NOTIFICATION_DURATION = 4000; // 4 seconds

  loadAchievements(achievements: Achievement[]): void {
    this.achievements = achievements;
  }

  loadUnlocked(unlockedIds: string[]): void {
    this.unlockedIds = new Set(unlockedIds);
  }

  loadCounters(counters: Record<string, number>): void {
    this.counters = new Map(Object.entries(counters));
  }

  getUnlockedIds(): string[] {
    return Array.from(this.unlockedIds);
  }

  getCounters(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }

  /**
   * Increment a counter (e.g., people_helped, library_visits)
   */
  incrementCounter(counterName: string, amount: number = 1): void {
    const current = this.counters.get(counterName) || 0;
    this.counters.set(counterName, current + amount);
    this.checkAchievements();
  }

  /**
   * Check all achievements against current state
   */
  checkAchievements(): void {
    const state = appStore.getState();

    for (const achievement of this.achievements) {
      // Skip already unlocked
      if (this.unlockedIds.has(achievement.id)) continue;

      if (this.evaluateCondition(achievement.condition, state)) {
        this.unlockAchievement(achievement);
      }
    }
  }

  private evaluateCondition(
    condition: AchievementCondition,
    state: ReturnType<typeof appStore.getState>
  ): boolean {
    switch (condition.type) {
      case "questComplete": {
        const questState = state.game.questStates[condition.questId!];
        return questState === "completed";
      }
      case "stat": {
        const statValue = (state.game.player as Record<string, number>)[condition.stat!] || 0;
        return this.compareValue(statValue, condition.op!, condition.value!);
      }
      case "counter": {
        const counterValue = this.counters.get(condition.counter!) || 0;
        return counterValue >= (condition.value || 0);
      }
      case "relationship": {
        if (state.game.npc.id === condition.npcId) {
          const value = state.game.npc.friendship;
          return this.compareValue(value, condition.op!, condition.value!);
        }
        return false;
      }
      default:
        return false;
    }
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

  private unlockAchievement(achievement: Achievement): void {
    this.unlockedIds.add(achievement.id);

    // Apply rewards
    if (Object.keys(achievement.reward).length > 0) {
      const currentStats = appStore.getState().game.player;
      appStore.updatePlayerStats({
        confidence: currentStats.confidence + (achievement.reward.confidence || 0),
        empathy: currentStats.empathy + (achievement.reward.empathy || 0),
        stress: currentStats.stress + (achievement.reward.stress || 0),
        reputation: currentStats.reputation + (achievement.reward.reputation || 0),
      });
    }

    // Queue notification
    this.notifications.push({
      achievement,
      displayUntil: Date.now() + this.NOTIFICATION_DURATION,
    });
  }

  /**
   * Get all achievements with their unlock status
   */
  getAllAchievements(): { achievement: Achievement; unlocked: boolean }[] {
    return this.achievements.map((a) => ({
      achievement: a,
      unlocked: this.unlockedIds.has(a.id),
    }));
  }

  /**
   * Get progress stats
   */
  getProgress(): { unlocked: number; total: number } {
    return {
      unlocked: this.unlockedIds.size,
      total: this.achievements.length,
    };
  }

  /**
   * Update and remove expired notifications
   */
  update(): void {
    const now = Date.now();
    this.notifications = this.notifications.filter(
      (n) => n.displayUntil > now
    );
  }

  /**
   * Render achievement notifications
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (this.notifications.length === 0) return;

    const { width } = ctx.canvas;
    ctx.save();

    // Render each notification (stacked from top)
    this.notifications.forEach((notification, index) => {
      const y = 20 + index * 70;
      this.renderNotification(ctx, notification.achievement, width, y);
    });

    ctx.restore();
  }

  private renderNotification(
    ctx: CanvasRenderingContext2D,
    achievement: Achievement,
    canvasWidth: number,
    y: number
  ): void {
    const panelWidth = 280;
    const panelHeight = 60;
    const panelX = canvasWidth - panelWidth - 20;

    // Panel background
    ctx.fillStyle = "rgba(30, 58, 95, 0.95)";
    ctx.fillRect(panelX, y, panelWidth, panelHeight);

    // Gold border
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, y, panelWidth, panelHeight);

    // Achievement icon placeholder
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("★", panelX + 30, y + 38);

    // Title
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Achievement Unlocked!", panelX + 55, y + 22);

    // Achievement name
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "13px Arial";
    ctx.fillText(achievement.title, panelX + 55, y + 42);
  }

  /**
   * Render achievements panel (for pause menu or dedicated screen)
   */
  renderPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.save();

    // Panel background
    ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Title
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Achievements", x + width / 2, y + 30);

    // Progress
    const progress = this.getProgress();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px Arial";
    ctx.fillText(
      `${progress.unlocked} / ${progress.total} unlocked`,
      x + width / 2,
      y + 52
    );

    // Achievement list
    const startY = y + 75;
    const itemHeight = 45;
    const maxVisible = Math.floor((height - 90) / itemHeight);

    this.achievements.slice(0, maxVisible).forEach((achievement, index) => {
      const itemY = startY + index * itemHeight;
      const unlocked = this.unlockedIds.has(achievement.id);

      // Item background
      ctx.fillStyle = unlocked
        ? "rgba(74, 158, 255, 0.1)"
        : "rgba(100, 116, 139, 0.1)";
      ctx.fillRect(x + 10, itemY, width - 20, itemHeight - 5);

      // Icon
      ctx.fillStyle = unlocked ? "#ffd700" : "#4b5563";
      ctx.font = "18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(unlocked ? "★" : "☆", x + 30, itemY + 28);

      // Title
      ctx.fillStyle = unlocked ? "#e2e8f0" : "#64748b";
      ctx.font = unlocked ? "bold 14px Arial" : "14px Arial";
      ctx.textAlign = "left";
      ctx.fillText(achievement.title, x + 50, itemY + 20);

      // Description
      ctx.fillStyle = unlocked ? "#94a3b8" : "#4b5563";
      ctx.font = "12px Arial";
      ctx.fillText(achievement.description, x + 50, itemY + 36);
    });

    ctx.restore();
  }
}
