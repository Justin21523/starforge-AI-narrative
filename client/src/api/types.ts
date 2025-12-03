/**
 * Shared dialogue data types for frontend and backend, using camelCase to match FastAPI schema.
 */
export type Speaker = "player" | "npc";

export interface DialogueHistoryEntry {
  speaker: Speaker;
  text: string;
}

export interface PlayerStats {
  confidence: number;
  empathy: number;
  stress: number;
  reputation: number;
}

export interface NpcStats {
  friendship: number;
  trust: number;
  roleTags: string[];
}

export interface QuestContext {
  questId: string;
  stage: string;
}

export interface PlayerStatsDelta {
  confidence?: number;
  empathy?: number;
  stress?: number;
  reputation?: number;
}

export interface NpcStatsDelta {
  friendship?: number;
  trust?: number;
}

export interface QuestUpdate {
  questId: string;
  newStage: string;
}

export interface InternalEffects {
  playerStatsDelta?: PlayerStatsDelta;
  npcStatsDelta?: NpcStatsDelta;
  questUpdates?: QuestUpdate[];
}

export interface DialogueRequest {
  playerId: string;
  npcId: string;
  sceneId: string;
  history: DialogueHistoryEntry[];
  playerStats: PlayerStats;
  npcStats: NpcStats;
  currentQuestContext?: QuestContext;
  locale: "en-US";
}

export interface DialogueResponse {
  npcText: string;
  suggestedPlayerChoices: string[];
  internalEffects?: InternalEffects;
  meta?: {
    trace?: Array<{ tool: string; output: Record<string, unknown>; error?: string | null }>;
    prompt?: string;
  };
}
