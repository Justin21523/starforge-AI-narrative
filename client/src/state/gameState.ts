export interface GameState {
  sceneId: string;
  sceneName: string;
  sceneConnections: string[];
  player: {
    confidence: number;
    empathy: number;
    stress: number;
    reputation: number;
    x: number;
  };
  npc: {
    id: string;
    name: string;
    friendship: number;
    trust: number;
    roleTags: string[];
    x: number;
  };
  questStates: Record<string, string>;
}

export const createInitialState = (): GameState => ({
  sceneId: "school_gate",
  sceneName: "School Gate",
  sceneConnections: ["home_morning", "hallway_morning", "street_corner"],
  player: {
    confidence: 5,
    empathy: 5,
    stress: 5,
    reputation: 5,
    x: 240,
  },
  npc: {
    id: "alex",
    name: "Alex",
    friendship: 3,
    trust: 2,
    roleTags: ["friend"],
    x: 520,
  },
  questStates: {},
});
