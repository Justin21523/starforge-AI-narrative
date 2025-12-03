import type { SceneDef, NpcDef, QuestDef } from "../types/dataTypes";

export interface PlayerStateResponse {
  playerStats: {
    confidence: number;
    empathy: number;
    stress: number;
    reputation: number;
  };
  npcStates: Record<
    string,
    { friendship: number; trust: number; roleTags: string[] }
  >;
  sceneId?: string;
}

export interface LoreSearchResult {
  query: string;
  hits: Array<{ id?: string; text: string; tags?: string[] }>;
  mock?: boolean;
}

export class GameHttpClient {
  constructor(private baseUrl = "/game") {}

  async fetchScenes(): Promise<SceneDef[]> {
    const res = await fetch(`${this.baseUrl}/scenes`);
    if (!res.ok) throw new Error("Failed to fetch scenes");
    return res.json();
  }

  async fetchNpcs(): Promise<NpcDef[]> {
    const res = await fetch(`${this.baseUrl}/npcs`);
    if (!res.ok) throw new Error("Failed to fetch npcs");
    return res.json();
  }

  async fetchPlayerState(playerId: string): Promise<PlayerStateResponse> {
    const res = await fetch(`${this.baseUrl}/player/${playerId}/state`);
    if (!res.ok) throw new Error("Failed to fetch player state");
    return res.json();
  }

  async fetchQuests(): Promise<QuestDef[]> {
    const res = await fetch(`${this.baseUrl}/quests`);
    if (!res.ok) throw new Error("Failed to fetch quests");
    return res.json();
  }

  async searchLore(query: string): Promise<LoreSearchResult> {
    const res = await fetch(
      `${this.baseUrl}/lore/search?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error("Failed to search lore");
    return res.json();
  }

  async fetchPlayerQuests(playerId = "player-001"): Promise<Record<string, string>> {
    const res = await fetch(`${this.baseUrl}/player/${playerId}/quests`);
    if (!res.ok) throw new Error("Failed to fetch player quests");
    return res.json();
  }

  async updatePlayerQuests(
    playerId: string,
    updates: Array<{ questId: string; newStage: string }>
  ) {
    await fetch(`${this.baseUrl}/player/${playerId}/quests`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }
}
