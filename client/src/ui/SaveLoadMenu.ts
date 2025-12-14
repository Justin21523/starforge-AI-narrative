import { InputManager } from "../core/InputManager";
import { GameHttpClient } from "../api/gameClient";
import { appStore } from "../state/store";
import { ToastManager } from "./Toast";
import { t } from "../i18n/i18n";

export class SaveLoadMenu {
  private visible = false;
  private mode: "save" | "load" = "save";
  private selectedSlot = 0;
  private slots = ["Slot 1", "Slot 2", "Slot 3"];
  private httpClient = new GameHttpClient("/game");
  private onClose?: () => void;
  private onLoadComplete?: (snapshot: any) => void;

  constructor(
    private input: InputManager,
    private toast?: ToastManager
  ) {}

  open(mode: "save" | "load", onClose?: () => void, onLoadComplete?: (snapshot: any) => void) {
    this.visible = true;
    this.mode = mode;
    this.onClose = onClose;
    this.onLoadComplete = onLoadComplete;
    this.selectedSlot = 0;
  }

  close() {
    this.visible = false;
    this.onClose?.();
  }

  isVisible() {
    return this.visible;
  }

  update() {
    if (!this.visible) return;

    if (this.input.consumePress("ArrowUp")) {
      this.selectedSlot = (this.selectedSlot - 1 + this.slots.length) % this.slots.length;
    }
    if (this.input.consumePress("ArrowDown")) {
      this.selectedSlot = (this.selectedSlot + 1) % this.slots.length;
    }
    if (this.input.consumePress("Enter")) {
      this.confirm();
    }
    if (this.input.consumePress("Escape")) {
      this.close();
    }
  }

  private async confirm() {
    const slotId = `slot_${this.selectedSlot + 1}`;
    const playerId = appStore.getState().game.player["id"] || "player-001"; // Assuming id might be added or default

    if (this.mode === "save") {
      try {
        const state = appStore.getState().game;
        // Convert inventory Record<string, number> to string[] for backend
        // or backend should support Record? Backend schema says List[str].
        // Let's assume we just save item IDs for now.
        const inventoryList = Object.keys(state.inventory); 
        
        const res = await this.httpClient.saveGame(playerId, slotId, {
            x: state.player.x,
            gold: state.player.gold,
            inventory: inventoryList
        });
        
        if (res.success) {
            this.toast?.add("Game Saved!");
            this.close();
        } else {
            this.toast?.add("Save Failed: " + res.message);
        }
      } catch (e) {
        console.error(e);
        this.toast?.add("Save Error");
      }
    } else {
      try {
        const res = await this.httpClient.loadGame(playerId, slotId);
        if (res.success && res.snapshot) {
            this.toast?.add("Game Loaded!");
            this.onLoadComplete?.(res.snapshot);
            this.close();
        } else {
            this.toast?.add("Load Failed: " + (res.message || "No Data"));
        }
      } catch (e) {
         console.error(e);
         this.toast?.add("Load Error");
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return;

    const { width, height } = ctx.canvas;
    
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, width, height);

    const panelW = 400;
    const panelH = 300;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    // Panel
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Title
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.mode === "save" ? "Save Game" : "Load Game", width / 2, panelY + 40);

    // Slots
    ctx.font = "18px Arial";
    this.slots.forEach((slot, index) => {
      const y = panelY + 100 + index * 40;
      const isSelected = index === this.selectedSlot;

      if (isSelected) {
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`> ${slot} <`, width / 2, y);
      } else {
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(slot, width / 2, y);
      }
    });

    // Hint
    ctx.fillStyle = "#64748b";
    ctx.font = "14px Arial";
    ctx.fillText("[Enter] Confirm   [Esc] Cancel", width / 2, panelY + panelH - 20);
    
    ctx.textAlign = "left";
  }
}