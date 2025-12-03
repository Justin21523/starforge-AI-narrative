import { InputManager } from "../core/InputManager";
import { SaveManager } from "../save/SaveManager";
import { appStore } from "../state/store";
import { ToastManager } from "./Toast";
import { SaveLoadMenu } from "./SaveLoadMenu";
import { SettingsPanel } from "./SettingsPanel";
import { t } from "../i18n/i18n";

type PauseOption = "resume" | "save" | "load" | "settings" | "main_menu";

interface PauseMenuCallbacks {
  onResume: () => void;
  onMainMenu: () => void;
  onAction?: (action: string) => void;
}

/**
 * Pause menu overlay that can be shown during gameplay.
 * Handles save/load operations and navigation.
 */
export class PauseMenu {
  private visible = false;
  private input: InputManager;
  private saveManager: SaveManager;
  private toast?: ToastManager;
  private callbacks: PauseMenuCallbacks;
  private saveLoadMenu: SaveLoadMenu;
  private settingsPanel: SettingsPanel;

  private selectedIndex = 0;

  private getMenuOptions(): { id: PauseOption; label: string }[] {
    return [
      { id: "resume", label: t("pause_resume") },
      { id: "save", label: t("pause_save") },
      { id: "load", label: t("pause_load") },
      { id: "settings", label: t("pause_settings") },
      { id: "main_menu", label: t("pause_main_menu") },
    ];
  }

  // Confirmation dialog state
  private confirmDialog: {
    visible: boolean;
    message: string;
    onConfirm: () => void;
  } | null = null;

  constructor(
    inputManager: InputManager,
    callbacks: PauseMenuCallbacks,
    toastManager?: ToastManager
  ) {
    this.input = inputManager;
    this.callbacks = callbacks;
    this.toast = toastManager;
    this.saveManager = new SaveManager("player-001");
    this.saveLoadMenu = new SaveLoadMenu(
      inputManager,
      "player-001",
      { onClose: () => {} },
      toastManager
    );
    this.settingsPanel = new SettingsPanel(
      inputManager,
      () => {},
      toastManager,
      (action: string) => {
        this.hide();
        callbacks.onAction?.(action);
      }
    );
  }

  show(): void {
    this.visible = true;
    this.selectedIndex = 0;
    this.confirmDialog = null;
  }

  hide(): void {
    this.visible = false;
    this.confirmDialog = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(): void {
    if (!this.visible) return;

    // Handle SaveLoadMenu
    if (this.saveLoadMenu.isVisible()) {
      this.saveLoadMenu.update();
      return;
    }

    // Handle SettingsPanel
    if (this.settingsPanel.isVisible()) {
      this.settingsPanel.update();
      return;
    }

    // Handle confirmation dialog
    if (this.confirmDialog?.visible) {
      this.handleConfirmInput();
      return;
    }

    // Navigate menu
    if (this.input.consumePress("ArrowUp")) {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.getMenuOptions().length) % this.getMenuOptions().length;
    }
    if (this.input.consumePress("ArrowDown")) {
      this.selectedIndex = (this.selectedIndex + 1) % this.getMenuOptions().length;
    }

    // Select option
    if (this.input.consumePress("Enter")) {
      this.selectOption();
    }

    // Close menu with Escape
    if (this.input.consumePress("Escape")) {
      this.hide();
      this.callbacks.onResume();
    }
  }

  private handleConfirmInput(): void {
    if (this.input.consumePress("Enter") || this.input.consumePress("KeyY")) {
      this.confirmDialog?.onConfirm();
      this.confirmDialog = null;
    }
    if (this.input.consumePress("Escape") || this.input.consumePress("KeyN")) {
      this.confirmDialog = null;
    }
  }

  private selectOption(): void {
    const option = this.getMenuOptions()[this.selectedIndex];

    switch (option.id) {
      case "resume":
        this.hide();
        this.callbacks.onResume();
        break;

      case "save":
        this.saveLoadMenu.show("save");
        break;

      case "load":
        this.saveLoadMenu.show("load");
        break;

      case "settings":
        this.settingsPanel.show();
        break;

      case "main_menu":
        this.showMainMenuConfirm();
        break;
    }
  }

  private saveGame(): void {
    const state = appStore.getState().game;
    const success = this.saveManager.save({
      sceneId: state.sceneId,
      sceneName: state.sceneName,
      player: {
        x: state.player.x,
        confidence: state.player.confidence,
        empathy: state.player.empathy,
        stress: state.player.stress,
        reputation: state.player.reputation,
      },
      npc: {
        id: state.npc.id,
        name: state.npc.name,
        friendship: state.npc.friendship,
        trust: state.npc.trust,
      },
      questStates: state.questStates,
    });

    if (success) {
      this.toast?.add("Game saved!");
    } else {
      this.toast?.add("Failed to save game");
    }
  }

  private showLoadConfirm(): void {
    if (!this.saveManager.hasSave()) {
      this.toast?.add("No save file found");
      return;
    }

    this.confirmDialog = {
      visible: true,
      message: "Load saved game? Current progress will be lost.",
      onConfirm: () => this.loadGame(),
    };
  }

  private loadGame(): void {
    const saveData = this.saveManager.load();
    if (saveData) {
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
      this.toast?.add("Game loaded!");
      this.hide();
      this.callbacks.onResume();
    } else {
      this.toast?.add("Failed to load game");
    }
  }

  private showMainMenuConfirm(): void {
    this.confirmDialog = {
      visible: true,
      message: "Return to main menu? Unsaved progress will be lost.",
      onConfirm: () => {
        this.hide();
        this.callbacks.onMainMenu();
      },
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    // Render SaveLoadMenu if visible
    if (this.saveLoadMenu.isVisible()) {
      this.saveLoadMenu.render(ctx);
      return;
    }

    // Render SettingsPanel if visible
    if (this.settingsPanel.isVisible()) {
      this.settingsPanel.render(ctx);
      return;
    }

    const { width, height } = ctx.canvas;
    ctx.save();

    // Dim background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, width, height);

    // Menu panel
    const panelWidth = 300;
    const panelHeight = 320;
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
    ctx.fillText(t("pause_title"), width / 2, panelY + 40);

    // Confirmation dialog or menu
    if (this.confirmDialog?.visible) {
      this.renderConfirmDialog(ctx, panelX, panelY, panelWidth, panelHeight);
    } else {
      this.renderMenuOptions(ctx, panelX, panelY, panelWidth);
    }

    ctx.restore();
  }

  private renderMenuOptions(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    panelWidth: number
  ): void {
    const startY = panelY + 80;
    const spacing = 45;

    this.getMenuOptions().forEach((option, index) => {
      const y = startY + index * spacing;
      const isSelected = index === this.selectedIndex;

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
        ctx.fillRect(panelX + 20, y - 18, panelWidth - 40, 36);
      }

      // Option text
      ctx.font = isSelected ? "bold 18px Arial" : "18px Arial";
      ctx.fillStyle = isSelected ? "#38bdf8" : "#e2e8f0";
      ctx.textAlign = "center";
      ctx.fillText(option.label, panelX + panelWidth / 2, y + 6);
    });

    // Controls hint
    ctx.font = "12px Arial";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(
      t("pause_controls"),
      panelX + panelWidth / 2,
      panelY + 260
    );
  }

  private renderConfirmDialog(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    panelWidth: number,
    panelHeight: number
  ): void {
    if (!this.confirmDialog) return;

    // Message
    ctx.font = "16px Arial";
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";

    // Word wrap the message
    const words = this.confirmDialog.message.split(" ");
    let line = "";
    let y = panelY + 100;
    const maxWidth = panelWidth - 40;

    words.forEach((word) => {
      const testLine = line + word + " ";
      if (ctx.measureText(testLine).width > maxWidth) {
        ctx.fillText(line, panelX + panelWidth / 2, y);
        line = word + " ";
        y += 24;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line, panelX + panelWidth / 2, y);

    // Buttons
    const buttonY = panelY + panelHeight - 80;

    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(t("confirm_yes"), panelX + panelWidth * 0.3, buttonY);

    ctx.fillStyle = "#f87171";
    ctx.fillText(t("confirm_no"), panelX + panelWidth * 0.7, buttonY);
  }
}
