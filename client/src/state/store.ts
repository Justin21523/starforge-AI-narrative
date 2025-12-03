import { SceneDef, NpcDef, QuestDef } from "../types/dataTypes";
import { DialogueResponse } from "../api/types";
import { createInitialState, GameState } from "./gameState";
import { defaultConfig, AppConfig } from "./appConfig";

type Listener = () => void;

export interface AppState {
  config: AppConfig;
  game: GameState;
  scenes: SceneDef[];
  npcs: NpcDef[];
  quests: QuestDef[];
  lastAiResponse?: DialogueResponse;
  promptLog: { prompt?: string; trace?: any; npcText?: string }[];
}

class Store {
  private state: AppState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = {
      config: { ...defaultConfig },
      game: createInitialState(),
      scenes: [],
      npcs: [],
      quests: [],
      lastAiResponse: undefined,
      promptLog: [],
    };
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  setScenes(scenes: SceneDef[]) {
    this.state.scenes = scenes;
    this.emit();
  }

  setNpcs(npcs: NpcDef[]) {
    this.state.npcs = npcs;
    this.emit();
  }

  setQuests(quests: QuestDef[]) {
    this.state.quests = quests;
    this.emit();
  }

  setConfig(config: Partial<AppConfig>) {
    this.state.config = { ...this.state.config, ...config };
    this.emit();
  }

  setGameState(game: Partial<GameState>) {
    this.state.game = { ...this.state.game, ...game };
    this.emit();
  }

  setQuestStates(states: Record<string, string>) {
    this.state.game.questStates = states;
    this.emit();
  }

  updatePlayerStats(delta: Partial<GameState["player"]>) {
    this.state.game.player = { ...this.state.game.player, ...delta };
    this.emit();
  }

  updateNpcStats(delta: Partial<GameState["npc"]>) {
    this.state.game.npc = { ...this.state.game.npc, ...delta };
    this.emit();
  }

  setScene(sceneId: string, sceneName: string, connections: string[]) {
    this.state.game.sceneId = sceneId;
    this.state.game.sceneName = sceneName;
    this.state.game.sceneConnections = connections;
    this.emit();
  }

  setLastAiResponse(resp: DialogueResponse | undefined) {
    this.state.lastAiResponse = resp;
    if (resp?.meta) {
      const entry = {
        prompt: resp.meta.prompt,
        trace: resp.meta.trace,
        npcText: resp.npcText,
      };
      this.state.promptLog = [entry, ...this.state.promptLog].slice(0, 5);
    }
    this.emit();
  }

  clearPromptLog() {
    this.state.promptLog = [];
    this.emit();
  }
}

export const appStore = new Store();
