/**
 * Defines NPC placements for each scene.
 * This maps scene IDs to the NPCs that appear in them.
 */

export interface SceneNpcPlacement {
  npcId: string;
  x: number;
  facing: "left" | "right";
}

/**
 * Map of scene IDs to NPC placements.
 * NPCs listed here will appear in the corresponding scenes.
 */
export const sceneNpcMap: Record<string, SceneNpcPlacement[]> = {
  // Home scenes
  home_morning: [
    { npcId: "mom", x: 600, facing: "left" },
    { npcId: "dad", x: 700, facing: "left" },
  ],
  home_evening: [
    { npcId: "mom", x: 550, facing: "left" },
    { npcId: "dad", x: 650, facing: "left" },
  ],

  // School entrance
  school_gate: [
    { npcId: "alex", x: 520, facing: "left" },
    { npcId: "bryce", x: 700, facing: "left" },
  ],

  // Hallways
  hallway_morning: [
    { npcId: "alex", x: 400, facing: "right" },
    { npcId: "bryce", x: 600, facing: "left" },
    { npcId: "ms_carter", x: 750, facing: "left" },
  ],
  hallway_afternoon: [
    { npcId: "bryce", x: 450, facing: "right" },
    { npcId: "sam", x: 650, facing: "left" },
  ],

  // Classroom
  classroom_5a: [
    { npcId: "alex", x: 350, facing: "right" },
    { npcId: "sam", x: 500, facing: "left" },
    { npcId: "ms_carter", x: 700, facing: "left" },
  ],

  // Cafeteria
  cafeteria: [
    { npcId: "alex", x: 300, facing: "right" },
    { npcId: "sam", x: 450, facing: "left" },
    { npcId: "bryce", x: 650, facing: "left" },
  ],

  // Library
  library: [
    { npcId: "sam", x: 500, facing: "left" },
    { npcId: "mr_chen", x: 700, facing: "left" },
  ],

  // Playground
  playground: [
    { npcId: "alex", x: 400, facing: "right" },
    { npcId: "bryce", x: 600, facing: "left" },
    { npcId: "sam", x: 750, facing: "left" },
  ],

  // Counselor's office
  counselor_office: [{ npcId: "ms_thompson", x: 600, facing: "left" }],

  // Principal's office
  principal_office: [{ npcId: "mr_wilson", x: 600, facing: "left" }],

  // Street corner
  street_corner: [
    { npcId: "alex", x: 500, facing: "left" },
    { npcId: "shop_owner", x: 700, facing: "left" },
  ],

  // Park
  park: [
    { npcId: "alex", x: 450, facing: "right" },
    { npcId: "sam", x: 650, facing: "left" },
  ],

  // Convenience store
  convenience_store: [{ npcId: "shop_owner", x: 600, facing: "left" }],

  // Friend's house
  friend_house: [
    { npcId: "alex", x: 500, facing: "left" },
    { npcId: "alex_mom", x: 700, facing: "left" },
  ],
};

/**
 * Get NPCs for a specific scene.
 */
export function getNpcsForScene(sceneId: string): SceneNpcPlacement[] {
  return sceneNpcMap[sceneId] || [];
}

/**
 * Get the first available NPC in a scene (for default interaction).
 */
export function getDefaultNpc(sceneId: string): SceneNpcPlacement | null {
  const npcs = getNpcsForScene(sceneId);
  return npcs.length > 0 ? npcs[0] : null;
}
