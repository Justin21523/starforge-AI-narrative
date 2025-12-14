import { BaseScene } from "./BaseScene";
import { SceneManager, TransitionType } from "../../core/SceneManager";
import { InputManager } from "../../core/InputManager";
import { DialogueOverlay } from "../../ui/DialogueOverlay";
import { PauseMenu } from "../../ui/PauseMenu";
import { QuestTracker } from "../../ui/QuestTracker";
import { FriendshipIndicator, RelationshipPanel } from "../../ui/FriendshipIndicator";
import { appStore } from "../../state/store";
import { getNpcsForScene, SceneNpcPlacement } from "../SceneNpcMapping";
import { AiClient, MockAiClient, HttpAiClient } from "../../api/aiClient";
import { GameHttpClient } from "../../api/gameClient";
import { loadScene } from "../../data/loader";
import { ToastManager } from "../../ui/Toast";
import { EventManager, GameEvent } from "../EventManager";
import { AchievementManager, Achievement } from "../AchievementManager";
import { TutorialManager } from "../../ui/TutorialManager";
import { BuildingEntranceManager } from "../BuildingEntranceManager";
import { InteriorScene } from "./InteriorScene";
import { QuestManager } from "../QuestManager";
import { InventoryManager } from "../InventoryManager";
import { ShopManager } from "../ShopManager";
import { ShopUI } from "../../ui/ShopUI";
import { MapOverlay } from "../../ui/MapOverlay";
import { t } from "../../i18n/i18n";
import { getAutoSaveManager } from "../../save/AutoSaveManager";
import { getGameStats } from "../../stats/GameStats";
import type { DialogueResponse } from "../../api/types";
import type { AppConfig } from "../../state/appConfig";
import type { BuildingDef } from "../../types/dataTypes";

type GameMode = "explore" | "npc_select" | "dialogue" | "paused" | "event" | "tutorial" | "shop";

/**
 * Main exploration scene where player can move around,
 * interact with NPCs, and navigate between scenes.
 */
export class ExplorationScene extends BaseScene {
  private mode: GameMode = "explore";
  private previousMode: GameMode = "explore";
  private overlay: DialogueOverlay;
  private pauseMenu: PauseMenu;
  private questTracker: QuestTracker;
  private friendshipIndicator: FriendshipIndicator;
  private relationshipPanel: RelationshipPanel;
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
  private npcPatrolState: Record<
    string,
    {
      base: number;
      dir: 1 | -1;
      range: number;
      speed: number;
      targetX: number;
      lastPlan: number;
      replanInterval: number;
      cellSize: number;
      visited: Map<string, number>;
    }
  > = {};
  private selectedNpcIndex = 0;
  private currentNpcId: string | null = null;

  // NPC proximity interaction
  private nearestNpc: SceneNpcPlacement | null = null;
  private readonly INTERACTION_DISTANCE = 80; // pixels

  // Building entrance system
  private buildingManager: BuildingEntranceManager;
  private nearestBuilding: BuildingDef | null = null;
  private lastExteriorPosition: number = 0;

  // Quest system
  private questManager: QuestManager;

  // Shop system
  private inventoryManager: InventoryManager;
  private shopManager: ShopManager;
  private shopUI: ShopUI;
  private mapOverlay: MapOverlay;

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
        onLoad: (snapshot: any) => this.handleLoadGame(snapshot),
      },
      toastManager
    );

    // Initialize quest tracker (positioned at top-left)
    this.questTracker = new QuestTracker({
      x: 10,
      y: 50,
      width: 280,
      maxQuests: 3,
    });

    // Initialize friendship indicators
    this.friendshipIndicator = new FriendshipIndicator();
    this.relationshipPanel = new RelationshipPanel();

    // Initialize event and achievement managers
    this.eventManager = new EventManager();
    this.achievementManager = new AchievementManager();
    this.tutorialManager = new TutorialManager(inputManager, () => {
      this.mode = "explore";
    });

    // Initialize building entrance manager
    this.buildingManager = new BuildingEntranceManager();

    // Initialize shop system
    this.inventoryManager = new InventoryManager();
    this.shopManager = new ShopManager();
    this.shopUI = new ShopUI(inputManager, this.inventoryManager, this.shopManager);
    this.mapOverlay = new MapOverlay();

    // Load shop data (async, non-blocking)
    this.inventoryManager.loadItems();
    this.shopManager.loadShops();

    // Quest manager
    this.questManager = new QuestManager(this.httpClient, "player-001");

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
    // 深拷貝避免修改全域配置
    this.npcsInScene = getNpcsForScene(state.sceneId).map((p) => ({ ...p }));
    this.setupNpcPatrol(state.sceneId);
    this.buildingManager.loadEntrances(state.sceneId);
    this.mode = "explore";
    this.dialogueHistory = [];

    // 自動推進場景相關的任務步驟
    const questUpdates = this.questManager.onSceneEntered(state.sceneId);
    questUpdates.forEach((u) => this.questTracker.highlightQuest(u.questId));

    // Update quest tracker with current quest data
    this.updateQuestTracker();
  }

  private updateQuestTracker(): void {
    const { quests, game } = appStore.getState();
    this.questTracker.setQuests(quests, game.questStates);
  }

  onExit(): void {
    this.mode = "explore";
    this.connectionMenuOpen = false;
  }

  onResume(): void {
    // Called when returning from interior scene
    console.log("[ExplorationScene] Resumed from interior");
    appStore.updatePlayerStats({ x: this.lastExteriorPosition });
    this.buildingManager.loadEntrances(appStore.getState().game.sceneId);
    this.mode = "explore";
  }

  update(delta: number): void {
    // Update achievement notifications
    this.achievementManager.update();

    // Update quest tracker animation
    this.questTracker.update(delta);

    // Update friendship UI
    this.friendshipIndicator.update(delta);
    this.relationshipPanel.update(delta);

    // 更新路人巡邏
    this.updateNpcPatrol(delta);

    // Periodic event check (only in explore mode)
    if (this.mode === "explore") {
      this.eventCheckTimer += delta;
      if (this.eventCheckTimer >= this.EVENT_CHECK_INTERVAL) {
        this.eventCheckTimer = 0;
        this.checkForRandomEvent();
      }

      // Update NPC proximity detection
      this.updateNpcProximity();

      // Update building proximity detection
      this.updateBuildingProximity();
    }

    this.handleInput(delta);
  }

  private setupNpcPatrol(sceneId: string): void {
    this.npcPatrolState = {};
    const mapWidth = this.getCurrentMapWidth();
    const now = performance.now();
    this.npcsInScene.forEach((npc, idx) => {
      if (!npc.patrol) return;
      const key = `${sceneId}-${npc.npcId}-${idx}`;
      const dir = npc.facing === "left" ? -1 : 1;
      const cellSize = 120;
      const range = Math.min(npc.patrol.range, mapWidth);
      this.npcPatrolState[key] = {
        base: npc.x,
        dir,
        range,
        speed: npc.patrol.speed ?? 30,
        targetX: this.pickFrontierTarget(npc.x, range, mapWidth, dir),
        lastPlan: now,
        replanInterval: 2800, // ms
        cellSize,
        visited: new Map<string, number>(),
      };
    });
  }

  private pickFrontierTarget(baseX: number, range: number, mapWidth: number, dir: 1 | -1): number {
    const now = Date.now();
    const minX = Math.max(0, baseX - range);
    const maxX = Math.min(mapWidth, baseX + range);
    const cellSize = 120;
    const candidates: { x: number; score: number }[] = [];
    for (let x = minX; x <= maxX; x += cellSize) {
      const distance = Math.abs(x - baseX);
      const novelty = Math.random() * 0.2 + 0.8; // 假設有前端探索記憶時可改用 visited age
      const forwardBias = dir === 1 ? x - baseX : baseX - x;
      const biasScore = forwardBias > 0 ? 10 : 0;
      const score = distance * 0.6 + novelty * 20 + biasScore;
      candidates.push({ x: Math.min(Math.max(x, 0), mapWidth), score });
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0].x : baseX;
  }

  private updateNpcPatrol(delta: number): void {
    const mapWidth = this.getCurrentMapWidth();
    const sceneId = appStore.getState().game.sceneId;
    const now = performance.now();

    this.npcsInScene.forEach((npc, idx) => {
      if (!npc.patrol) return;
      const key = `${sceneId}-${npc.npcId}-${idx}`;
      const state = this.npcPatrolState[key];
      if (!state) return;

      // 若距離目標過近或超過重規劃時間，選新目標（帶前進偏好與距離/新鮮度）
      const distToTarget = Math.abs(state.targetX - npc.x);
      if (distToTarget < 12 || now - state.lastPlan > state.replanInterval) {
        state.targetX = this.pickFrontierTarget(state.base, state.range, mapWidth, state.dir);
        state.lastPlan = now;
      }

      // 依方向向目標前進
      state.dir = state.targetX >= npc.x ? 1 : -1;
      npc.facing = state.dir === 1 ? "right" : "left";
      npc.x += state.dir * state.speed * delta;

      // clamp
      const leftBound = Math.max(0, state.base - state.range);
      const rightBound = Math.min(mapWidth, state.base + state.range);
      if (npc.x > rightBound) {
        npc.x = rightBound;
        state.dir = -1;
        state.targetX = rightBound - 10;
      } else if (npc.x < leftBound) {
        npc.x = leftBound;
        state.dir = 1;
        state.targetX = leftBound + 10;
      }
    });
  }

  private updateNpcProximity(): void {
    const playerX = appStore.getState().game.player.x;

    let closest: SceneNpcPlacement | null = null;
    let minDist = Infinity;

    this.npcsInScene.forEach((npc) => {
      const dist = Math.abs(npc.x - playerX);
      if (dist < this.INTERACTION_DISTANCE && dist < minDist) {
        minDist = dist;
        closest = npc;
      }
    });

    this.nearestNpc = closest;
  }

  private updateBuildingProximity(): void {
    const playerX = appStore.getState().game.player.x;
    const proximity = this.buildingManager.checkProximity(playerX);
    this.nearestBuilding = proximity.entrance;
  }

  private enterBuilding(entrance: BuildingDef): void {
    console.log(`[ExplorationScene] Entering building: ${entrance.id}`);
    this.lastExteriorPosition = appStore.getState().game.player.x;

    const interiorScene = new InteriorScene(
      this.sceneManager,
      this.input,
      entrance.targetSceneId,
      200  // Exit door position in interior
    );

    this.sceneManager.pushScene(interiorScene);
    getGameStats().recordSceneVisit(entrance.targetSceneId);
  }

  private checkForRandomEvent(): void {
    const state = appStore.getState().game;
    const event = this.eventManager.checkForEvents(state.sceneId);
    if (event) {
      this.eventManager.triggerEvent(event);
      this.previousMode = this.mode;
      this.mode = "event";
      getGameStats().recordEventTriggered();
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

    // Handle shop mode
    if (this.mode === "shop") {
      this.shopUI.update();
      if (!this.shopUI.isVisible()) {
        this.mode = "explore";
      }
      return;
    }

    // Handle map overlay
    if (this.mapOverlay.isVisible()) {
      if (this.input.consumePress("ArrowUp")) this.mapOverlay.move(0, -1);
      if (this.input.consumePress("ArrowDown")) this.mapOverlay.move(0, 1);
      if (this.input.consumePress("ArrowLeft")) this.mapOverlay.move(-1, 0);
      if (this.input.consumePress("ArrowRight")) this.mapOverlay.move(1, 0);
      if (this.input.consumePress("Enter")) {
        this.mapOverlay.confirm();
      }
      if (this.input.consumePress("KeyM") || this.input.consumePress("Escape")) {
        this.mapOverlay.close();
        this.mode = "explore";
      }
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

    // Open map overlay
    if (this.mode === "explore" && this.input.consumePress("KeyM")) {
      this.mode = "map";
      this.mapOverlay.open((sceneId) => {
        this.navigateToScene(sceneId);
      });
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
        this.handleDialogueInput(delta);
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
        getGameStats().recordEventChoice();
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
      this.toast?.add(t("tutorial_restarted"));
    }
  }

  private handleLoadGame(snapshot: any): void {
    const targetSceneId = snapshot.sceneId;
    const scene = loadScene(targetSceneId);
    
    if (scene) {
        // Ensure store has correct scene data (PauseMenu might have set placeholder)
        appStore.setScene(scene.id, scene.name, scene.connections);
        
        // Reset scene entities
        this.npcsInScene = getNpcsForScene(targetSceneId).map((p) => ({ ...p }));
        this.setupNpcPatrol(targetSceneId);
        this.buildingManager.loadEntrances(targetSceneId);
        
        // Reset UI state
        this.connectionMenuOpen = false;
        this.mode = "explore";
        this.updateQuestTracker();
        
        this.toast?.add(`Loaded: ${scene.name}`);
    } else {
        console.error(`Scene ${targetSceneId} not found`);
        this.toast?.add(`Error loading scene ${targetSceneId}`);
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

  private getCurrentMapWidth(): number {
    const scenes = appStore.getState().scenes;
    const state = appStore.getState().game;
    const currentScene = scenes.find(s => s.id === state.sceneId);
    return currentScene?.mapWidth ?? 960; // Default: no scrolling
  }

  private updateCamera(playerX: number, mapWidth: number): void {
    const canvasWidth = 960;

    // Center player, clamp to boundaries
    let targetCameraX = playerX - canvasWidth / 2;
    targetCameraX = Math.max(0, Math.min(mapWidth - canvasWidth, targetCameraX));

    // Smooth lerp
    const currentCameraX = appStore.getState().game.camera?.x ?? 0;
    const newCameraX = currentCameraX + (targetCameraX - currentCameraX) * 0.15;

    appStore.updateCameraPosition(newCameraX);
  }

  private handleExploreInput(delta: number, state: ReturnType<typeof appStore.getState>["game"]): void {
    const speed = 200 * delta;
    const mapWidth = this.getCurrentMapWidth();

    // Movement
    if (this.input.isPressed("ArrowLeft")) {
      const newX = Math.max(0, state.player.x - speed);
      appStore.updatePlayerStats({
        x: newX,
        facingDirection: "left"
      });
      this.updateCamera(newX, mapWidth);
    }
    if (this.input.isPressed("ArrowRight")) {
      const newX = Math.min(mapWidth, state.player.x + speed);
      appStore.updatePlayerStats({
        x: newX,
        facingDirection: "right"
      });
      this.updateCamera(newX, mapWidth);
    }

    // Interact with nearest building or NPC (E key)
    if (this.input.consumePress("KeyE")) {
      if (this.nearestBuilding) {
        this.enterBuilding(this.nearestBuilding);
      } else if (this.nearestNpc) {
        this.startDialogue(this.nearestNpc.npcId);
      } else {
        this.toast?.add(t("explore_nothing_nearby"));
      }
    }

    // Scene navigation (N key)
    if (this.input.consumePress("KeyN")) {
      if (state.sceneConnections.length > 0) {
        this.connectionMenuOpen = !this.connectionMenuOpen;
        this.selectedConnectionIndex = 0;
      }
    }

    // Toggle quest tracker (Q key)
    if (this.input.consumePress("KeyQ")) {
      this.questTracker.toggle();
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

  private handleDialogueInput(delta: number): void {
    // Update typewriter animation
    this.overlay.update(delta);

    // Navigate choices (only when typewriter is complete)
    if (this.input.consumePress("ArrowUp")) {
      this.overlay.moveSelection(-1);
    }
    if (this.input.consumePress("ArrowDown")) {
      this.overlay.moveSelection(1);
    }

    // Select choice or skip typewriter
    if (this.input.consumePress("Enter")) {
      // First, try to skip typewriter if not complete
      if (this.overlay.skipTypewriter()) {
        return;
      }

      // Otherwise, select the choice
      const choice = this.overlay.getSelectedChoice();
      if (choice) {
        this.dialogueHistory.push({ speaker: "player", text: choice });
        this.dialogueHistory = this.dialogueHistory.slice(-6);
        getGameStats().recordDialogueChoice();
        void this.triggerDialogue();
      }
    }

    // Exit dialogue
    if (this.input.consumePress("Escape")) {
      this.mode = "explore";
      this.currentNpcId = null;
      this.relationshipPanel.hide();
    }
  }

  private async startDialogue(npcId: string): Promise<void> {
    const npcs = appStore.getState().npcs;
    const npcDef = npcs.find((n) => n.id === npcId);

    // Check if NPC is a shopkeeper
    if (npcDef?.roleTags?.includes("shopkeeper") || npcDef?.roleTags?.includes("merchant")) {
      console.log(`[ExplorationScene] Opening shop for ${npcId}`);
      this.openShop(npcId);
      return;
    }

    this.currentNpcId = npcId;
    this.mode = "dialogue";
    this.dialogueHistory = [];

    // Record dialogue stats
    getGameStats().recordDialogue(npcId);

    // Update store with current NPC
    if (npcDef) {
      const friendship = npcDef.initialStats?.friendship ?? 0;
      const trust = npcDef.initialStats?.trust ?? 0;

      appStore.updateNpcStats({
        id: npcId,
        name: npcDef.name,
        friendship,
        trust,
        roleTags: npcDef.roleTags ?? [],
      });

      // Set NPC info for dialogue overlay
      this.overlay.setNpcInfo(npcDef.name, `/sprites/npc_${npcId}.svg`);

      // Show relationship panel
      this.relationshipPanel.setNpc(npcDef.name, friendship, trust);
      this.relationshipPanel.show();
    }

    await this.triggerDialogue();
  }

  private openShop(npcId: string): void {
    // Default shop ID based on NPC ID
    const shopId = `${npcId}_shop`;
    this.shopUI.open(shopId);
    this.mode = "shop";
    getGameStats().recordDialogue(npcId); // Count as interaction
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
      const newFriendship = state.npc.friendship + (delta.friendship ?? 0);
      const newTrust = state.npc.trust + (delta.trust ?? 0);

      appStore.updateNpcStats({
        friendship: newFriendship,
        trust: newTrust,
      });

      // Show friendship change indicators (centered at top)
      if (delta.friendship && delta.friendship !== 0) {
        this.friendshipIndicator.showChange({
          type: "friendship",
          delta: delta.friendship,
          npcName: state.npc.name,
        }, 480, 120);
      }
      if (delta.trust && delta.trust !== 0) {
        this.friendshipIndicator.showChange({
          type: "trust",
          delta: delta.trust,
          npcName: state.npc.name,
        }, 480, 120);
      }

      // Update relationship panel
      this.relationshipPanel.setNpc(state.npc.name, newFriendship, newTrust);
    }

    if (res.internalEffects?.questUpdates?.length) {
      const current = appStore.getState().game.questStates;
      const next = { ...current };
      res.internalEffects.questUpdates.forEach((q) => {
        next[q.questId] = q.newStage;
        // Highlight updated quest in tracker
        this.questTracker.highlightQuest(q.questId);
      });
      appStore.setQuestStates(next);
      this.toast?.add(t("quest_updated"));

      // Update quest tracker
      this.updateQuestTracker();

      void this.httpClient
        .updatePlayerQuests("player-001", res.internalEffects.questUpdates)
        .catch(() => undefined);
    }

    // Check achievements after any effects
    this.achievementManager.checkAchievements();
  }

  private async navigateToScene(targetSceneId: string): Promise<void> {
    try {
      const state = appStore.getState().game;
      await this.httpClient.travel(state.player.id, targetSceneId);

      const scene = loadScene(targetSceneId);
      if (scene) {
        appStore.setScene(scene.id, scene.name, scene.connections);
        appStore.updatePlayerStats({ x: 240 });
        this.npcsInScene = getNpcsForScene(targetSceneId).map((p) => ({ ...p }));
        this.setupNpcPatrol(targetSceneId);
        this.connectionMenuOpen = false;
        this.mode = "explore";
        this.toast?.add(`${t("explore_moved_to")} ${scene.name}`);

        // Record scene visit stats
        getGameStats().recordSceneVisit(targetSceneId);

        // Trigger auto-save on scene change
        getAutoSaveManager("player-001").onSceneChange(targetSceneId);

        // 場景觸發任務步驟
        const questUpdates = this.questManager.onSceneEntered(targetSceneId);
        questUpdates.forEach((u) => this.questTracker.highlightQuest(u.questId));
        this.updateQuestTracker();
      }
    } catch (error) {
      console.error("Travel failed:", error);
      this.toast?.add("Travel failed");
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;
    const state = appStore.getState().game;
    const cameraX = state.camera?.x ?? 0;

    ctx.save();

    // Background with parallax (0.5x camera speed)
    this.renderBackground(ctx, state.sceneId, state.sceneName, cameraX * 0.5);

    // Apply camera transform to world objects
    ctx.translate(-cameraX, 0);

    // Floor
    this.renderFloor(ctx);

    // Buildings (behind NPCs and player)
    this.buildingManager.renderEntrances(ctx, state.player.x, height);

    // NPCs
    this.renderNpcs(ctx, height);

    // Player
    this.renderPlayer(ctx, state.player.x, height);

    // Restore to screen space for UI elements
    ctx.restore();
    ctx.save();

    // HUD (screen space)
    this.renderHUD(ctx, state);

    // Mode-specific UI
    switch (this.mode) {
      case "npc_select":
        this.renderNpcSelector(ctx);
        break;
      case "dialogue":
        this.overlay.render(ctx);
        break;
      case "shop":
        this.shopUI.render(ctx);
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
      case "map":
        this.mapOverlay.render(ctx);
        break;
    }

    // Quest tracker (only in explore mode, not during dialogue/menus)
    if (this.mode === "explore" || this.mode === "npc_select") {
      this.questTracker.render(ctx);
    }

    // Relationship panel (during dialogue)
    if (this.mode === "dialogue") {
      this.relationshipPanel.render(ctx);
    }

    if (this.mapOverlay.isVisible()) {
      this.mapOverlay.render(ctx);
    }

    // Scene connection menu
    if (this.connectionMenuOpen) {
      this.renderConnectionMenu(ctx, state.sceneConnections);
    }

    // Friendship change indicators (always visible, above everything)
    this.friendshipIndicator.render(ctx);

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

      // [E] interaction prompt for nearest NPC
      if (this.nearestNpc?.npcId === placement.npcId) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
        ctx.fillRect(placement.x + 4, height - 185, 40, 18);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("[E]", placement.x + 24, height - 173);
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

    // Gold display (top right)
    ctx.textAlign = "right";
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 16px Arial";
    ctx.fillText(`Gold: ${state.player.gold}`, width - 16, 26);

    // Player stats (below gold)
    ctx.font = "11px Arial";
    ctx.fillStyle = "#94a3b8";
    const stats = [
      `CON: ${state.player.confidence}`,
      `EMP: ${state.player.empathy}`,
      `STR: ${state.player.stress}`,
      `REP: ${state.player.reputation}`,
    ];
    ctx.fillText(stats.join(" | "), width - 16, 40);
    ctx.textAlign = "left";

    // Controls hint
    if (this.mode === "explore") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "11px Arial";
      ctx.fillText(t("explore_controls") + "  [Q] " + t("quest_tracker_title"), 16, ctx.canvas.height - 90);
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
    ctx.fillText(t("explore_talk_to"), boxX + 16, boxY + 28);

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
    ctx.fillText(t("explore_select_controls"), boxX + 16, boxY + boxHeight - 10);
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
    ctx.fillText(t("explore_go_to"), boxX + 12, boxY + 22);

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
