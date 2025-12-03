import { InputManager } from "../core/InputManager";
import { SaveManager, SaveData } from "../save/SaveManager";
import { appStore } from "../state/store";
import { ToastManager } from "./Toast";

type MenuMode = "save" | "load";

interface SaveLoadMenuCallbacks {
  onClose: () => void;
  onLoad?: (saveData: SaveData) => void;
}

/**
 * Save/Load menu with multiple slot support.
 * Shows 3 save slots with preview info and allows save/load operations.
 */
export class SaveLoadMenu {
  private visible = false;
  private mode: MenuMode = "save";
  private input: InputManager;
  private playerId: string;
  private toast?: ToastManager;
  private callbacks: SaveLoadMenuCallbacks;

  private slots: (SaveData | null)[] = [];
  private selectedIndex = 0;

  // Confirmation dialog
  private confirmDialog: {
    visible: boolean;
    message: string;
    onConfirm: () => void;
  } | null = null;

  constructor(
    inputManager: InputManager,
    playerId: string,
    callbacks: SaveLoadMenuCallbacks,
    toastManager?: ToastManager
  ) {
    this.input = inputManager;
    this.playerId = playerId;
    this.callbacks = callbacks;
    this.toast = toastManager;
  }

  show(mode: MenuMode): void {
    this.visible = true;
    this.mode = mode;
    this.selectedIndex = 0;
    this.confirmDialog = null;
    this.refreshSlots();
  }

  hide(): void {
    this.visible = false;
    this.confirmDialog = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  private refreshSlots(): void {
    this.slots = SaveManager.getSlotsForPlayer(this.playerId);
  }

  update(): void {
    if (!this.visible) return;

    // Handle confirmation dialog
    if (this.confirmDialog?.visible) {
      this.handleConfirmInput();
      return;
    }

    // Navigate slots
    if (this.input.consumePress("ArrowUp")) {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.slots.length) % this.slots.length;
    }
    if (this.input.consumePress("ArrowDown")) {
      this.selectedIndex = (this.selectedIndex + 1) % this.slots.length;
    }

    // Select slot
    if (this.input.consumePress("Enter")) {
      this.selectSlot();
    }

    // Delete save with D key
    if (this.input.consumePress("KeyD")) {
      this.showDeleteConfirm();
    }

    // Close menu with Escape
    if (this.input.consumePress("Escape")) {
      this.hide();
      this.callbacks.onClose();
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

  private selectSlot(): void {
    const slot = this.slots[this.selectedIndex];

    if (this.mode === "save") {
      if (slot) {
        // Overwrite confirmation
        this.confirmDialog = {
          visible: true,
          message: `Overwrite Slot ${this.selectedIndex + 1}?`,
          onConfirm: () => this.saveToSlot(),
        };
      } else {
        this.saveToSlot();
      }
    } else {
      // Load mode
      if (slot) {
        this.confirmDialog = {
          visible: true,
          message: "Load this save? Current progress will be lost.",
          onConfirm: () => this.loadFromSlot(),
        };
      } else {
        this.toast?.add("Empty slot");
      }
    }
  }

  private saveToSlot(): void {
    const saveManager = new SaveManager(this.playerId, this.selectedIndex);
    const state = appStore.getState().game;

    const success = saveManager.save({
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
      this.toast?.add(`Saved to Slot ${this.selectedIndex + 1}`);
      this.refreshSlots();
    } else {
      this.toast?.add("Failed to save");
    }
  }

  private loadFromSlot(): void {
    const saveManager = new SaveManager(this.playerId, this.selectedIndex);
    const saveData = saveManager.load();

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

      this.toast?.add("Game loaded");
      this.hide();
      this.callbacks.onLoad?.(saveData);
      this.callbacks.onClose();
    } else {
      this.toast?.add("Failed to load");
    }
  }

  private showDeleteConfirm(): void {
    const slot = this.slots[this.selectedIndex];
    if (!slot) {
      this.toast?.add("Slot is empty");
      return;
    }

    this.confirmDialog = {
      visible: true,
      message: `Delete Slot ${this.selectedIndex + 1}?`,
      onConfirm: () => this.deleteSlot(),
    };
  }

  private deleteSlot(): void {
    const saveManager = new SaveManager(this.playerId, this.selectedIndex);
    const success = saveManager.deleteSave();

    if (success) {
      this.toast?.add("Save deleted");
      this.refreshSlots();
    } else {
      this.toast?.add("Failed to delete");
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const { width, height } = ctx.canvas;
    ctx.save();

    // Dim background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, width, height);

    // Menu panel
    const panelWidth = 400;
    const panelHeight = 350;
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
    ctx.fillText(
      this.mode === "save" ? "SAVE GAME" : "LOAD GAME",
      width / 2,
      panelY + 40
    );

    // Confirmation dialog or slots
    if (this.confirmDialog?.visible) {
      this.renderConfirmDialog(ctx, panelX, panelY, panelWidth, panelHeight);
    } else {
      this.renderSlots(ctx, panelX, panelY, panelWidth);
    }

    ctx.restore();
  }

  private renderSlots(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    panelWidth: number
  ): void {
    const startY = panelY + 70;
    const slotHeight = 70;

    this.slots.forEach((slot, index) => {
      const y = startY + index * slotHeight;
      const isSelected = index === this.selectedIndex;

      // Slot background
      ctx.fillStyle = isSelected
        ? "rgba(56, 189, 248, 0.2)"
        : "rgba(100, 116, 139, 0.1)";
      ctx.fillRect(panelX + 20, y, panelWidth - 40, slotHeight - 10);

      // Slot border
      ctx.strokeStyle = isSelected ? "#38bdf8" : "#475569";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(panelX + 20, y, panelWidth - 40, slotHeight - 10);

      // Slot label
      ctx.font = "bold 16px Arial";
      ctx.fillStyle = isSelected ? "#38bdf8" : "#e2e8f0";
      ctx.textAlign = "left";
      ctx.fillText(`Slot ${index + 1}`, panelX + 35, y + 25);

      if (slot) {
        // Save info
        ctx.font = "14px Arial";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(slot.gameState.sceneName, panelX + 35, y + 45);

        ctx.textAlign = "right";
        ctx.fillText(
          SaveManager.formatTimestamp(slot.timestamp),
          panelX + panelWidth - 35,
          y + 25
        );

        // Stats preview
        const stats = slot.gameState.player;
        ctx.fillText(
          `CONF ${stats.confidence} | EMP ${stats.empathy}`,
          panelX + panelWidth - 35,
          y + 45
        );
      } else {
        ctx.font = "italic 14px Arial";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.fillText("- Empty -", panelX + panelWidth / 2, y + 38);
      }
    });

    // Controls hint
    ctx.font = "12px Arial";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.fillText(
      "[↑↓] Navigate  [Enter] Select  [D] Delete  [Esc] Back",
      panelX + panelWidth / 2,
      panelY + 330
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
    ctx.font = "18px Arial";
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.fillText(this.confirmDialog.message, panelX + panelWidth / 2, panelY + 140);

    // Buttons
    const buttonY = panelY + panelHeight - 100;

    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("[Y] Yes", panelX + panelWidth * 0.3, buttonY);

    ctx.fillStyle = "#f87171";
    ctx.fillText("[N] No", panelX + panelWidth * 0.7, buttonY);
  }
}
