import { BaseScene } from "./BaseScene";
import { SceneManager } from "../../core/SceneManager";
import { InputManager } from "../../core/InputManager";
import { ExplorationScene } from "./ExplorationScene";
import { SaveManager } from "../../save/SaveManager";
import { appStore } from "../../state/store";
import { hydrateFromLocal } from "../../state/initData";
import type { AppConfig } from "../../state/appConfig";
import { ToastManager } from "../../ui/Toast";
import { SettingsPanel } from "../../ui/SettingsPanel";
import { t } from "../../i18n/i18n";

type MenuOption = "new_game" | "continue" | "settings";

/**
 * Title screen / main menu scene.
 * Shows game title and menu options.
 */
export class TitleScene extends BaseScene {
  private menuOptions: { id: MenuOption; label: string; enabled: boolean }[] = [];
  private selectedIndex = 0;
  private saveManager: SaveManager;
  private config: AppConfig;
  private toast?: ToastManager;
  private titleAlpha = 0;
  private fadeIn = true;
  private settingsPanel: SettingsPanel;

  constructor(
    sceneManager: SceneManager,
    inputManager: InputManager,
    config: AppConfig,
    toastManager?: ToastManager
  ) {
    super(sceneManager, inputManager);
    this.config = config;
    this.toast = toastManager;
    this.saveManager = new SaveManager("player-001");
    this.settingsPanel = new SettingsPanel(
      inputManager,
      () => {}, // onClose callback
      toastManager
    );
    this.buildMenu();
  }

  private buildMenu(): void {
    const hasSave = this.saveManager.hasSave();
    this.menuOptions = [
      { id: "new_game", label: t("menu_new_game"), enabled: true },
      { id: "continue", label: t("menu_continue"), enabled: hasSave },
      { id: "settings", label: t("menu_settings"), enabled: true },
    ];
    // Default to Continue if save exists
    this.selectedIndex = hasSave ? 1 : 0;
  }

  onEnter(): void {
    this.titleAlpha = 0;
    this.fadeIn = true;
    this.buildMenu();
  }

  update(delta: number): void {
    // Fade in animation
    if (this.fadeIn && this.titleAlpha < 1) {
      this.titleAlpha = Math.min(1, this.titleAlpha + delta * 2);
    }

    // Handle settings panel
    if (this.settingsPanel.isVisible()) {
      this.settingsPanel.update();
      return;
    }

    this.handleInput();
  }

  private handleInput(): void {
    // Navigate menu
    if (this.input.consumePress("ArrowUp")) {
      this.moveCursor(-1);
    }
    if (this.input.consumePress("ArrowDown")) {
      this.moveCursor(1);
    }

    // Select option
    if (this.input.consumePress("Enter") || this.input.consumePress("Space")) {
      this.selectOption();
    }
  }

  private moveCursor(direction: number): void {
    const enabledOptions = this.menuOptions.filter((o) => o.enabled);
    if (enabledOptions.length === 0) return;

    // Find current position in enabled options
    const currentOption = this.menuOptions[this.selectedIndex];
    const currentEnabledIndex = enabledOptions.findIndex(
      (o) => o.id === currentOption?.id
    );

    // Move within enabled options
    let newEnabledIndex = currentEnabledIndex + direction;
    if (newEnabledIndex < 0) newEnabledIndex = enabledOptions.length - 1;
    if (newEnabledIndex >= enabledOptions.length) newEnabledIndex = 0;

    // Find the actual index
    const newOption = enabledOptions[newEnabledIndex];
    this.selectedIndex = this.menuOptions.findIndex((o) => o.id === newOption.id);
  }

  private selectOption(): void {
    const option = this.menuOptions[this.selectedIndex];
    if (!option || !option.enabled) return;

    switch (option.id) {
      case "new_game":
        this.startNewGame();
        break;
      case "continue":
        this.continueGame();
        break;
      case "settings":
        this.settingsPanel.show();
        break;
    }
  }

  private startNewGame(): void {
    // Reset to initial state
    hydrateFromLocal();
    this.launchGame(true); // Start tutorial for new game
  }

  private continueGame(): void {
    const saveData = this.saveManager.load();
    if (saveData) {
      // Restore game state from save
      const gs = saveData.gameState;
      appStore.setScene(gs.sceneId, gs.sceneName, []);
      appStore.updatePlayerStats({
        x: gs.player.x,
        confidence: gs.player.confidence,
        empathy: gs.player.empathy,
        stress: gs.player.stress,
        reputation: gs.player.reputation,
      });
      appStore.updateNpcStats({
        id: gs.npc.id,
        name: gs.npc.name,
        friendship: gs.npc.friendship,
        trust: gs.npc.trust,
      });
      appStore.setQuestStates(gs.questStates);
      this.toast?.add("Game loaded");
    } else {
      // Fallback if save corrupted
      hydrateFromLocal();
    }
    this.launchGame();
  }

  private launchGame(startTutorial: boolean = false): void {
    const explorationScene = new ExplorationScene(
      this.sceneManager,
      this.input,
      this.config,
      this.toast
    );
    this.sceneManager.setScene(explorationScene, "fade");

    // Start tutorial for new games
    if (startTutorial) {
      // Delay slightly to let scene transition complete
      setTimeout(() => explorationScene.startTutorial(), 500);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;
    ctx.save();

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#1e3a5f");
    gradient.addColorStop(1, "#0d1b2a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Stars background effect
    this.renderStars(ctx, width, height);

    // Title with fade
    ctx.globalAlpha = this.titleAlpha;

    // Game title
    ctx.fillStyle = "#f0f4f8";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(t("title_game"), width / 2, height * 0.25);

    // Subtitle
    ctx.font = "24px Arial";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(t("title_subtitle"), width / 2, height * 0.25 + 40);

    // Menu options
    const menuStartY = height * 0.5;
    const menuSpacing = 50;

    this.menuOptions.forEach((option, index) => {
      const y = menuStartY + index * menuSpacing;
      const isSelected = index === this.selectedIndex;
      const isEnabled = option.enabled;

      // Selection indicator
      if (isSelected && isEnabled) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
        ctx.fillRect(width / 2 - 120, y - 25, 240, 40);
      }

      // Option text
      ctx.font = isSelected ? "bold 22px Arial" : "20px Arial";
      if (!isEnabled) {
        ctx.fillStyle = "#4b5563";
      } else if (isSelected) {
        ctx.fillStyle = "#38bdf8";
      } else {
        ctx.fillStyle = "#e2e8f0";
      }
      ctx.fillText(option.label, width / 2, y);
    });

    // Controls hint
    ctx.globalAlpha = this.titleAlpha * 0.6;
    ctx.font = "14px Arial";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${t("controls_navigate")}  ${t("controls_select")}`, width / 2, height - 40);

    // Version
    ctx.font = "12px Arial";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.fillText("v0.3.0", width - 20, height - 20);

    ctx.restore();

    // Render settings panel on top
    if (this.settingsPanel.isVisible()) {
      this.settingsPanel.render(ctx);
    }
  }

  private renderStars(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Simple star field
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    const starCount = 50;
    for (let i = 0; i < starCount; i++) {
      // Deterministic positions based on index
      const x = ((i * 127) % width);
      const y = ((i * 73) % height);
      const size = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
