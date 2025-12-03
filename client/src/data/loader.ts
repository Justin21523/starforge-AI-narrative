import scenes from "../../../data/scenes/base_scenes.json";
import npcs from "../../../data/npcs/base_npcs.json";
import type { SceneDef, NpcDef } from "../types/dataTypes";

export const loadScene = (sceneId: string): SceneDef | undefined =>
  scenes.find((s) => s.id === sceneId);

export const loadNpc = (npcId: string): NpcDef | undefined =>
  npcs.find((n) => n.id === npcId);
