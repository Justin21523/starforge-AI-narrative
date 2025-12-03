import { AiClient, MockAiClient, HttpAiClient } from "../../api/aiClient";
import { DialogueOverlay } from "../../ui/DialogueOverlay";
import { Scene } from "../../core/types";
import { AppConfig } from "../../state/appConfig";
import { InputManager } from "../../core/InputManager";
import { loadScene } from "../../data/loader";
import { appStore } from "../../state/store";
import { ToastManager } from "../../ui/Toast";
import type { DialogueResponse } from "../../api/types";
import { GameHttpClient } from "../../api/gameClient";
import type { PlanResult } from "../../types/traceTypes";

export class PlaceholderScene implements Scene {
  private ai: AiClient;
  private overlay: DialogueOverlay;
  private lastTrigger = 0;
  private input: InputManager;
  private onStateChange?: () => void;
  private toast?: ToastManager;
  private lastHistory: { speaker: "player" | "npc"; text: string }[] = [];
  private lastResponse?: DialogueResponse;
  private httpClient = new GameHttpClient("/game");
  private lastTrace: PlanResult[] = [];

  constructor(
    overlay: DialogueOverlay,
    config: AppConfig,
    aiClient?: AiClient,
    onStateChange?: () => void,
    inputManager?: InputManager,
    toastManager?: ToastManager
  ) {
    this.overlay = overlay;
    this.onStateChange = onStateChange;
    this.input = inputManager ?? new InputManager();
    this.toast = toastManager;
    this.ai =
      aiClient ??
      (config.useMockAi
        ? new MockAiClient()
        : new HttpAiClient(config.apiBaseUrl));
  }

  async triggerDialogue() {
    const state = appStore.getState().game;
    this.overlay.setLoading(true);
    const res = await this.ai.getNpcReply({
      playerId: "player-001",
      npcId: state.npc.id,
      sceneId: state.sceneId,
      history: this.lastHistory,
      playerStats: state.player,
      npcStats: {
        friendship: state.npc.friendship,
        trust: state.npc.trust,
        roleTags: state.npc.roleTags,
      },
      locale: "en-US",
    });
    // Apply internalEffects to frontend state
    if (res.internalEffects?.playerStatsDelta) {
      const delta = res.internalEffects.playerStatsDelta;
      appStore.updatePlayerStats({
        confidence: state.player.confidence + (delta.confidence ?? 0),
        empathy: state.player.empathy + (delta.empathy ?? 0),
        stress: state.player.stress + (delta.stress ?? 0),
        reputation: state.player.reputation + (delta.reputation ?? 0),
      });
      this.toast?.add("Player stats updated");
    }
    if (res.internalEffects?.npcStatsDelta) {
      const delta = res.internalEffects.npcStatsDelta;
      appStore.updateNpcStats({
        friendship: state.npc.friendship + (delta.friendship ?? 0),
        trust: state.npc.trust + (delta.trust ?? 0),
      });
    }
    if (res.internalEffects?.questUpdates?.length) {
      const current = appStore.getState().game.questStates;
      const next = { ...current };
      res.internalEffects.questUpdates.forEach((q) => {
        next[q.questId] = q.newStage;
      });
      appStore.setQuestStates(next);
      this.toast?.add("Quest progress updated");
      // PATCH quest updates to backend (best effort, ignore errors)
      void this.httpClient
        .updatePlayerQuests("player-001", res.internalEffects.questUpdates)
        .catch(() => undefined);
    }

    this.overlay.setDialogue(res.npcText, res.suggestedPlayerChoices);
    this.lastResponse = res;
    this.lastTrace = res.meta?.trace as PlanResult[] || [];
    this.lastHistory = [
      ...this.lastHistory,
      { speaker: "npc" as const, text: res.npcText },
    ].slice(-6);
    this.overlay.setLoading(false);
    appStore.setLastAiResponse(res);
    this.onStateChange?.();
  }

  update(delta: number): void {
    this.handleInput(delta);
    this.lastTrigger += delta;
    if (this.lastTrigger > 3) {
      this.lastTrigger = 0;
      void this.triggerDialogue();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;
    ctx.save();
    const state = appStore.getState().game;
    this.renderBackground(ctx, state.sceneId, state.sceneName);

    // Floor
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, height - 80, width, 80);

    // Player and NPC: try to load sprite, fallback to rectangle if not available
    const playerImg = this.getImage("player", "/sprites/player.svg");
    const npcImg =
      this.getImage(`npc-${state.npc.id}`, `/sprites/npc_${state.npc.id}.svg`) ||
      this.getImage("npc-generic", "/sprites/npc_generic.svg");

    if (playerImg && playerImg.complete) {
      ctx.drawImage(playerImg, state.player.x, height - 160, 48, 72);
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(state.player.x, height - 140, 40, 60);
    }

    if (npcImg && npcImg.complete) {
      ctx.drawImage(npcImg, state.npc.x, height - 160, 48, 72);
    } else {
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(state.npc.x, height - 140, 40, 60);
    }

    // Dialogue overlay
    this.overlay.render(ctx);
    ctx.restore();
  }

  private handleInput(delta: number) {
    const state = appStore.getState().game;
    const speed = 180 * delta;
    if (this.input.isPressed("ArrowLeft")) {
      appStore.updatePlayerStats({ x: Math.max(20, state.player.x - speed) });
    }
    if (this.input.isPressed("ArrowRight")) {
      appStore.updatePlayerStats({
        x: Math.min((state.sceneConnections.length > 0 ? 900 : 900), state.player.x + speed),
      });
    }
    if (this.input.consumePress("Enter")) {
      // Select currently highlighted option as player reply
      const choice = this.overlay.getSelectedChoice();
      if (choice) {
        this.lastHistory = [
          ...this.lastHistory,
          { speaker: "player" as const, text: choice },
        ].slice(-6);
      }
      void this.triggerDialogue();
    }
    if (this.input.isPressed("ArrowUp")) {
      if (this.input.consumePress("ArrowUp")) {
        this.overlay.moveSelection(-1);
      }
    }
    if (this.input.isPressed("ArrowDown")) {
      if (this.input.consumePress("ArrowDown")) {
        this.overlay.moveSelection(1);
      }
    }
    if (this.input.consumePress("KeyN")) {
      // Navigate to first connected scene (demo)
      const next = state.sceneConnections[0];
      if (next) {
        const scene = loadScene(next);
        if (scene) {
          appStore.setScene(scene.id, scene.name, scene.connections);
          appStore.updatePlayerStats({ x: 240 });
          appStore.updateNpcStats({ x: 520 });
          this.onStateChange?.();
        }
      }
    }
  }

  private sceneColors(sceneId: string): [string, string] {
    // Simple hash to determine gradient colors
    const hash = Array.from(sceneId).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hue1 = hash % 360;
    const hue2 = (hash * 3) % 360;
    return [`hsl(${hue1}, 45%, 30%)`, `hsl(${hue2}, 50%, 15%)`];
  }

  private renderBackground(ctx: CanvasRenderingContext2D, sceneId: string, sceneName: string) {
    const { width, height } = ctx.canvas;
    const scenes = appStore.getState().scenes;
    const sceneDef = scenes.find((s) => s.id === sceneId);
    const imageUrl = sceneDef?.backgroundImage;
    const cacheKey = imageUrl || sceneId;

    if (imageUrl) {
      const img = this.getImage(cacheKey, imageUrl);
      if (img && img.complete) {
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        this.renderGradient(ctx, sceneId, sceneName);
      }
    } else {
      this.renderGradient(ctx, sceneId, sceneName);
    }
  }

  private imageCache = new Map<string, HTMLImageElement>();
  private getImage(key: string, src: string): HTMLImageElement | null {
    if (this.imageCache.has(key)) return this.imageCache.get(key)!;
    const img = new Image();
    img.src = src;
    this.imageCache.set(key, img);
    return img;
  }

  private renderGradient(ctx: CanvasRenderingContext2D, sceneId: string, sceneName: string) {
    const { width, height } = ctx.canvas;
    const [colorTop, colorBottom] = this.sceneColors(sceneId);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, colorTop);
    gradient.addColorStop(1, colorBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    if (sceneName) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.font = "32px Arial";
      ctx.fillText(sceneName, 16, 48);
    }
  }
}
