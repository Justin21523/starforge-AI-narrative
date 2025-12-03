import { BaseScene } from "./BaseScene";
import { SceneManager, TransitionType } from "../../core/SceneManager";
import { InputManager } from "../../core/InputManager";
import { DialogueOverlay } from "../../ui/DialogueOverlay";
import { PauseMenu } from "../../ui/PauseMenu";
import { appStore } from "../../state/store";
import { getNpcsForScene, SceneNpcPlacement } from "../SceneNpcMapping";
import { AiClient, MockAiClient, HttpAiClient } from "../../api/aiClient";
import { GameHttpClient } from "../../api/gameClient";
import { loadScene } from "../../data/loader";
import { ToastManager } from "../../ui/Toast";
import { EventManager, GameEvent } from "../EventManager";
import { AchievementManager, Achievement } from "../AchievementManager";
import { TutorialManager } from "../../ui/TutorialManager";
import type { DialogueResponse } from "../../api/types";
import type { AppConfig } from "../../state/appConfig";

type GameMode = "explore" | "npc_select" | "dialogue" | "paused" | "event" | "tutorial";

/**
 * Main exploration scene where player can move around,
 * interact with NPCs, and navigate between scenes.
 */
export class ExplorationScene extends BaseScene {
  private mode: GameMode = "explore";
  private previousMode: GameMode = "explore";
  private overlay: DialogueOverlay;
  private pauseMenu: PauseMenu;
  private ai: AiClient;
  private httpClient = new GameHttpClient("/game");
  private toast?: ToastManager;
  private config: AppConfig;

  // Event and Achievement systems
  private eventManager: EventManager;
  private achievementManager: AchievementManager;
  private tutorialManager: TutorialManager;
  private eventCheckTimer = 0;
  private readonly EVENT_CHECK_INTERVAL = 5; // Check every 5 seconds

  // NPC selection
  private npcsInScene: SceneNpcPlacement[] = [];
  private selectedNpcIndex = 0;
  private currentNpcId: string | null = null;

  // Dialogue history
  private dialogueHistory: { speaker: "player" | "npc"; text: string }[] = [];
  private lastResponse?: DialogueResponse;

  // Scene connections UI
  private connectionMenuOpen = false;
  private selectedConnectionIndex = 0;

  constructor(
    sceneManager: SceneManager,
    inputManager: InputManager,
    config: AppConfig,
    toastManager?: ToastManager
  ) {
    super(sceneManager, inputManager);
    this.overlay = new DialogueOverlay();
    this.toast = toastManager;
    this.config = config;
    this.ai = config.useMockAi
      ? new MockAiClient()
      : new HttpAiClient(config.apiBaseUrl);

    // Initialize pause menu
    this.pauseMenu = new PauseMenu(
      inputManager,
      {
        onResume: () => this.resumeFromPause(),
        onMainMenu: () => this.returnToMainMenu(),
        onAction: (action: string) => this.handleSettingsAction(action),
      },
      toastManager
    );

    // Initialize event and achievement managers
    this.eventManager = new EventManager();
    this.achievementManager = new AchievementManager();
    this.tutorialManager = new TutorialManager(inputManager, () => {
      this.mode = "explore";
    });

    // Load events and achievements (async, non-blocking)
    this.loadEventData();
    this.loadAchievementData();
  }

  /**
   * Start the tutorial (called from TitleScene for new game)
   */
  startTutorial(): void {
    if (!TutorialManager.isCompleted()) {
      this.mode = "tutorial";
      this.tutorialManager.start();
    }
  }

  private async loadEventData(): Promise<void> {
    try {
      const response = await fetch("/data/events/random_events.json");
      if (response.ok) {
        const events: GameEvent[] = await response.json();
        this.eventManager.loadEvents(events);
      }
    } catch (err) {
      console.warn("Failed to load events:", err);
    }
  }

  private async loadAchievementData(): Promise<void> {
    try {
      const response = await fetch("/data/achievements/achievements.json");
      if (response.ok) {
        const achievements: Achievement[] = await response.json();
        this.achievementManager.loadAchievements(achievements);
      }
    } catch (err) {
      console.warn("Failed to load achievements:", err);
    }
  }

  onEnter(): void {
    const state = appStore.getState().game;
    this.npcsInScene = getNpcsForScene(state.sceneId);
    this.mode = "explore";
    this.dialogueHistory = [];
  }

  onExit(): void {
    this.mode = "explore";
    this.connectionMenuOpen = false;
  }

  update(delta: number): void {
    // Update achievement notifications
    this.achievementManager.update();

    // Periodic event check (only in explore mode)
    if (this.mode === "explore") {
      this.eventCheckTimer += delta;
      if (this.eventCheckTimer >= this.EVENT_CHECK_INTERVAL) {
        this.eventCheckTimer = 0;
        this.checkForRandomEvent();
      }
    }

    this.handleInput(delta);
  }

  private checkForRandomEvent(): void {
    const state = appStore.getState().game;
    const event = this.eventManager.checkForEvents(state.sceneId);
    if (event) {
      this.eventManager.triggerEvent(event);
      this.previousMode = this.mode;
      this.mode = "event";
    }
  }

  private handleInput(delta: number): void {
    const state = appStore.getState().game;

    // Handle tutorial mode
    if (this.mode === "tutorial") {
      this.tutorialManager.update(delta);
      return;
    }

    // Handle pause menu separately
    if (this.mode === "paused") {
      this.pauseMenu.update();
      return;
    }

    // Handle event mode
    if (this.mode === "event") {
      this.handleEventInput();
      return;
    }

    // Check for pause key (Escape in explore mode)
    if (this.mode === "explore" && this.input.consumePress("Escape")) {
      this.showPauseMenu();
      return;
    }

    switch (this.mode) {
      case "explore":
        this.handleExploreInput(delta, state);
        break;
      case "npc_select":
        this.handleNpcSelectInput();
        break;
      case "dialogue":
        this.handleDialogueInput();
        break;
    }
  }

  private handleEventInput(): void {
    if (this.eventManager.isShowingResult()) {
      // Dismiss result on Enter
      if (this.input.consumePress("Enter")) {
        this.eventManager.dismissEvent();
        this.mode = this.previousMode;
        // Check achievements after event
        this.achievementManager.checkAchievements();
      }
    } else {
      // Navigate choices
      if (this.input.consumePress("ArrowUp")) {
        this.eventManager.navigateUp();
      }
      if (this.input.consumePress("ArrowDown")) {
        this.eventManager.navigateDown();
      }
      // Select choice
      if (this.input.consumePress("Enter")) {
        this.eventManager.selectChoice();
      }
    }
  }

  private showPauseMenu(): void {
    this.previousMode = this.mode;
    this.mode = "paused";
    this.pauseMenu.show();
  }

  private resumeFromPause(): void {
    this.mode = this.previousMode;
  }

  private handleSettingsAction(action: string): void {
    if (action === "replayTutorial") {
      TutorialManager.reset();
      this.mode = "tutorial";
      this.tutorialManager.start();
      this.toast?.add("Tutorial restarted");
    }
  }

  private returnToMainMenu(): void {
    // Import TitleScene dynamically to avoid circular dependency
    import("./TitleScene").then(({ TitleScene }) => {
      const titleScene = new TitleScene(
        this.sceneManager,
        this.input,
        this.config,
        this.toast
      );
      this.sceneManager.setScene(titleScene, "fade");
    });
  }

  private handleExploreInput(delta: number, state: ReturnType<typeof appStore.getState>["game"]): void {
    const speed = 180 * delta;

    // Movement
    if (this.input.isPressed("ArrowLeft")) {
      appStore.updatePlayerStats({ x: Math.max(20, state.player.x - speed) });
    }
    if (this.input.isPressed("ArrowRight")) {
      appStore.updatePlayerStats({ x: Math.min(900, state.player.x + speed) });
    }

    // Open NPC selection (E key)
    if (this.input.consumePress("KeyE")) {
      if (this.npcsInScene.length > 0) {
        this.mode = "npc_select";
        this.selectedNpcIndex = 0;
      } else {
        this.toast?.add("No NPCs in this area");
      }
    }

    // Scene navigation (N key)
    if (this.input.consumePress("KeyN")) {
      if (state.sceneConnections.length > 0) {
        this.connectionMenuOpen = !this.connectionMenuOpen;
        this.selectedConnectionIndex = 0;
      }
    }

    // Handle connection menu
    if (this.connectionMenuOpen) {
      if (this.input.consumePress("ArrowUp")) {
        this.selectedConnectionIndex = Math.max(0, this.selectedConnectionIndex - 1);
      }
      if (this.input.consumePress("ArrowDown")) {
        this.selectedConnectionIndex = Math.min(
          state.sceneConnections.length - 1,
          this.selectedConnectionIndex + 1
        );
      }
      if (this.input.consumePress("Enter")) {
        const targetSceneId = state.sceneConnections[this.selectedConnectionIndex];
        this.navigateToScene(targetSceneId);
      }
      if (this.input.consumePress("Escape")) {
        this.connectionMenuOpen = false;
      }
    }
  }

  private handleNpcSelectInput(): void {
    // Navigate NPC list
    if (this.input.consumePress("ArrowUp")) {
      this.selectedNpcIndex = Math.max(0, this.selectedNpcIndex - 1);
    }
    if (this.input.consumePress("ArrowDown")) {
      this.selectedNpcIndex = Math.min(
        this.npcsInScene.length - 1,
        this.selectedNpcIndex + 1
      );
    }

    // Confirm selection
    if (this.input.consumePress("Enter")) {
      const selectedNpc = this.npcsInScene[this.selectedNpcIndex];
      if (selectedNpc) {
        this.startDialogue(selectedNpc.npcId);
      }
    }

    // Cancel
    if (this.input.consumePress("Escape")) {
      this.mode = "explore";
    }
  }

  private handleDialogueInput(): void {
    // Navigate choices
    if (this.input.consumePress("ArrowUp")) {
      this.overlay.moveSelection(-1);
    }
    if (this.input.consumePress("ArrowDown")) {
      this.overlay.moveSelection(1);
    }

    // Select choice
    if (this.input.consumePress("Enter")) {
      const choice = this.overlay.getSelectedChoice();
      if (choice) {
        this.dialogueHistory.push({ speaker: "player", text: choice });
        this.dialogueHistory = this.dialogueHistory.slice(-6);
        void this.triggerDialogue();
      }
    }

    // Exit dialogue
    if (this.input.consumePress("Escape")) {
      this.mode = "explore";
      this.currentNpcId = null;
    }
  }

  private async startDialogue(npcId: string): Promise<void> {
    this.currentNpcId = npcId;
    this.mode = "dialogue";
    this.dialogueHistory = [];

    // Update store with current NPC
    const npcs = appStore.getState().npcs;
    const npcDef = npcs.find((n) => n.id === npcId);
    if (npcDef) {
      appStore.updateNpcStats({
        id: npcId,
        name: npcDef.name,
        friendship: npcDef.initialStats?.friendship ?? 0,
        trust: npcDef.initialStats?.trust ?? 0,
        roleTags: npcDef.roleTags ?? [],
      });
    }

    await this.triggerDialogue();
  }

  private async triggerDialogue(): Promise<void> {
    if (!this.currentNpcId) return;

    const state = appStore.getState().game;
    this.overlay.setLoading(true);

    try {
      const res = await this.ai.getNpcReply({
        playerId: "player-001",
        npcId: this.currentNpcId,
        sceneId: state.sceneId,
        history: this.dialogueHistory,
        playerStats: state.player,
        npcStats: {
          friendship: state.npc.friendship,
          trust: state.npc.trust,
          roleTags: state.npc.roleTags,
        },
        locale: "en-US",
      });

      // Apply effects
      this.applyDialogueEffects(res, state);

      // Update overlay
      this.overlay.setDialogue(res.npcText, res.suggestedPlayerChoices);
      this.lastResponse = res;

      // Update history
      this.dialogueHistory.push({ speaker: "npc", text: res.npcText });
      this.dialogueHistory = this.dialogueHistory.slice(-6);

      appStore.setLastAiResponse(res);
    } catch (error) {
      console.error("Dialogue error:", error);
      this.overlay.setDialogue(
        "I'm sorry, I can't talk right now.",
        ["Okay", "I'll come back later"]
      );
    }

    this.overlay.setLoading(false);
  }

  private applyDialogueEffects(
    res: DialogueResponse,
    state: ReturnType<typeof appStore.getState>["game"]
  ): void {
    if (res.internalEffects?.playerStatsDelta) {
      const delta = res.internalEffects.playerStatsDelta;
      appStore.updatePlayerStats({
        confidence: state.player.confidence + (delta.confidence ?? 0),
        empathy: state.player.empathy + (delta.empathy ?? 0),
        stress: state.player.stress + (delta.stress ?? 0),
        reputation: state.player.reputation + (delta.reputation ?? 0),
      });
      this.toast?.add("Stats updated");
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
      this.toast?.add("Quest updated");

      void this.httpClient
        .updatePlayerQuests("player-001", res.internalEffects.questUpdates)
        .catch(() => undefined);
    }

    // Check achievements after any effects
    this.achievementManager.checkAchievements();
  }

  private navigateToScene(targetSceneId: string): void {
    const scene = loadScene(targetSceneId);
    if (scene) {
      appStore.setScene(scene.id, scene.name, scene.connections);
      appStore.updatePlayerStats({ x: 240 });
      this.npcsInScene = getNpcsForScene(targetSceneId);
      this.connectionMenuOpen = false;
      this.mode = "explore";
      this.toast?.add(`Moved to ${scene.name}`);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;
    const state = appStore.getState().game;

    ctx.save();

    // Background
    this.renderBackground(ctx, state.sceneId, state.sceneName);

    // Floor
    this.renderFloor(ctx);

    // NPCs
    this.renderNpcs(ctx, height);

    // Player
    this.renderPlayer(ctx, state.player.x, height);

    // HUD
    this.renderHUD(ctx, state);

    // Mode-specific UI
    switch (this.mode) {
      case "npc_select":
        this.renderNpcSelector(ctx);
        break;
      case "dialogue":
        this.overlay.render(ctx);
        break;
      case "paused":
        this.pauseMenu.render(ctx);
        break;
      case "event":
        this.eventManager.render(ctx);
        break;
      case "tutorial":
        this.tutorialManager.render(ctx);
        break;
    }

    // Scene connection menu
    if (this.connectionMenuOpen) {
      this.renderConnectionMenu(ctx, state.sceneConnections);
    }

    // Achievement notifications (always on top)
    this.achievementManager.render(ctx);

    ctx.restore();
  }

  private renderPlayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number
  ): void {
    const img = this.getImage("player", "/sprites/player.svg");
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, height - 160, 48, 72);
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(x, height - 140, 40, 60);
    }
  }

  private renderNpcs(ctx: CanvasRenderingContext2D, height: number): void {
    const npcs = appStore.getState().npcs;

    this.npcsInScene.forEach((placement, index) => {
      const npcDef = npcs.find((n) => n.id === placement.npcId);
      const img =
        this.getImage(`npc-${placement.npcId}`, `/sprites/npc_${placement.npcId}.svg`) ||
        this.getImage("npc-generic", "/sprites/npc_generic.svg");

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        if (placement.facing === "left") {
          ctx.translate(placement.x + 48, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, height - 160, 48, 72);
        } else {
          ctx.drawImage(img, placement.x, height - 160, 48, 72);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = "#f472b6";
        ctx.fillRect(placement.x, height - 140, 40, 60);
      }

      // NPC name label
      if (npcDef) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(npcDef.name, placement.x + 24, height - 165);
        ctx.textAlign = "left";
      }
    });
  }

  private renderHUD(
    ctx: CanvasRenderingContext2D,
    state: ReturnType<typeof appStore.getState>["game"]
  ): void {
    const { width } = ctx.canvas;

    // Scene name
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(state.sceneName, 16, 26);

    // Player stats (right side)
    ctx.textAlign = "right";
    ctx.font = "12px Arial";
    ctx.fillStyle = "#94a3b8";
    const stats = [
      `CON: ${state.player.confidence}`,
      `EMP: ${state.player.empathy}`,
      `STR: ${state.player.stress}`,
      `REP: ${state.player.reputation}`,
    ];
    ctx.fillText(stats.join(" | "), width - 16, 26);
    ctx.textAlign = "left";

    // Controls hint
    if (this.mode === "explore") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "11px Arial";
      ctx.fillText("[E] Talk to NPC  [N] Change Scene  [←→] Move", 16, ctx.canvas.height - 90);
    }
  }

  private renderNpcSelector(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;
    const npcs = appStore.getState().npcs;

    // Overlay background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, width, height);

    // Selector box
    const boxWidth = 300;
    const boxHeight = 50 + this.npcsInScene.length * 30;
    const boxX = (width - boxWidth) / 2;
    const boxY = (height - boxHeight) / 2;

    ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.fillText("Talk to...", boxX + 16, boxY + 28);

    // NPC list
    ctx.font = "14px Arial";
    this.npcsInScene.forEach((placement, index) => {
      const npcDef = npcs.find((n) => n.id === placement.npcId);
      const name = npcDef?.name || placement.npcId;
      const y = boxY + 50 + index * 28;
      const selected = index === this.selectedNpcIndex;

      ctx.fillStyle = selected ? "#38bdf8" : "#94a3b8";
      ctx.fillText(`${selected ? "➤ " : "  "}${name}`, boxX + 20, y);
    });

    // Hint
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "11px Arial";
    ctx.fillText("[↑↓] Select  [Enter] Confirm  [Esc] Cancel", boxX + 16, boxY + boxHeight - 10);
  }

  private renderConnectionMenu(
    ctx: CanvasRenderingContext2D,
    connections: string[]
  ): void {
    const { width, height } = ctx.canvas;
    const scenes = appStore.getState().scenes;

    // Menu box
    const boxWidth = 250;
    const boxHeight = 40 + connections.length * 28;
    const boxX = width - boxWidth - 20;
    const boxY = 60;

    ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.fillText("Go to:", boxX + 12, boxY + 22);

    // Connections
    ctx.font = "13px Arial";
    connections.forEach((sceneId, index) => {
      const sceneDef = scenes.find((s) => s.id === sceneId);
      const name = sceneDef?.name || sceneId;
      const y = boxY + 42 + index * 26;
      const selected = index === this.selectedConnectionIndex;

      ctx.fillStyle = selected ? "#38bdf8" : "#94a3b8";
      ctx.fillText(`${selected ? "➤ " : "  "}${name}`, boxX + 16, y);
    });
  }
}
