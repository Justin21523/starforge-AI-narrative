export interface SceneDef {
  id: string;
  name: string;
  connections: string[];
  backgroundPrompt?: string;
  backgroundImage?: string;
}

export interface NpcDef {
  id: string;
  name: string;
  roleTags: string[];
  persona?: string;
  imagePrompt?: string;
  initialStats?: {
    friendship: number;
    trust: number;
  };
}

export interface QuestStep {
  id: string;
  description: string;
}

export interface QuestDef {
  id: string;
  title: string;
  type: "main" | "side";
  steps: QuestStep[];
}
