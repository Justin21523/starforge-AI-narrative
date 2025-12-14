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
  onLoad?: (snapshot: any) => void;
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
    // this.saveManager = new SaveManager("player-001"); // Deprecated
    this.saveLoadMenu = new SaveLoadMenu(
      inputManager,
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
    this.saveLoadMenu.close();
  }
// ...
  private selectOption(): void {
    const option = this.getMenuOptions()[this.selectedIndex];

    switch (option.id) {
      case "resume":
        this.hide();
        this.callbacks.onResume();
        break;

      case "save":
        this.saveLoadMenu.open("save", () => {
             // On Close, do nothing, just return control to PauseMenu
        });
        break;

      case "load":
        this.saveLoadMenu.open("load", () => {
             // On Close
        }, (snapshot) => {
             this.restoreSnapshot(snapshot);
        });
        break;

      case "settings":
        this.settingsPanel.show();
        break;

      case "main_menu":
        this.showMainMenuConfirm();
        break;
    }
  }

  private restoreSnapshot(snapshot: any): void {
      if (!snapshot) return;
      
      // 1. Scene
      // We might need to fetch scene def to get name/connections, 
      // but for now set ID and let SceneManager/ExplorationScene handle loading logic if possible.
      // appStore.setScene triggers subscribers.
      appStore.setScene(snapshot.sceneId, "Loading...", []); 
      
      // 2. Player Stats
      // snapshot.playerStats has x, gold, etc.
      appStore.updatePlayerStats({
          confidence: snapshot.playerStats.confidence,
          empathy: snapshot.playerStats.empathy,
          stress: snapshot.playerStats.stress,
          reputation: snapshot.playerStats.reputation,
          gold: snapshot.playerStats.gold,
          x: snapshot.playerStats.x
      });
      
      // 3. NPC States
      // snapshot.npcStates is dict { npcId: stats }
      // appStore has array of NPCs? No, appStore.game.npc is single current NPC? 
      // appStore.game.npc is for "current interaction".
      // Global NPC states are stored where?
      // In `client/src/state/store.ts`: `npcs: NpcDef[]` is static data.
      // `game.npc` is ONLY current active NPC.
      // The client doesn't seem to persist ALL NPC states in `game` slice?
      // `ExplorationScene.ts`: `getNpcsForScene` uses `state.sceneId`.
      // `appStore.updateNpcStats` updates `game.npc`.
      
      // If client doesn't track all NPCs locally, then we rely on Server.
      // But `ExplorationScene` renders NPCs.
      // `ExplorationScene` calls `appStore.getState().npcs` (static data).
      // If we want dynamic friendship to show up, `GameHttpClient` fetches `fetchPlayerState`
      // which returns `npcStates`. 
      // We should probably update `ExplorationScene` to fetch/refresh state after load.
      // Or `appStore` should have `npcStates` map.
      // Currently `appStore.game.npc` is limited.
      
      // 4. Quests
      appStore.setQuestStates(snapshot.questStates);
      
      this.hide();
      this.callbacks.onResume();
      // Force reload scene logic might be needed in Game.ts or ExplorationScene
      // Usually changing sceneId in store should trigger reaction if listeners are set up,
      // OR we explicit call `sceneManager.setScene`.
      // The `ExplorationScene` watches store? No, `Game.ts` or `SceneManager` logic?
      // `ExplorationScene.navigateToScene` manually sets scene.
      
      // We need a way to trigger scene load from here.
      // But `PauseMenu` is UI.
      // We can add `onLoad` callback to `PauseMenuCallbacks`?
      // Or just reload the page? (Cheating)
      // Better: The `restoreSnapshot` updates store.
      // AND we need to tell the game to switch scene.
      // `appStore.setScene` updates data, but doesn't drive `SceneManager`.
      
      // Let's defer actual scene switch to the callback `onAction` or similar if needed,
      // or assume `Game.ts` monitors `sceneId`.
      // But `Game.ts` loop just calls `sceneManager.update`.
      
      // We will assume `ExplorationScene` or the context using `PauseMenu` can handle this.
      // `ExplorationScene` has `navigateToScene`.
      // But `PauseMenu` is inside `ExplorationScene`.
      // So `PauseMenu` can call `this.callbacks.onLoad(snapshot)`.
      
      if (this.callbacks["onLoad"]) {
          this.callbacks["onLoad"](snapshot);
      } else {
          window.location.reload(); // Fallback if no handler
      }
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
