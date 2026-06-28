import { GameHttpClient } from "../api/gameClient";

type QuestUpdate = { questId: string; newStage: string };

const SCENE_QUEST_UPDATES: Record<string, QuestUpdate[]> = {
  library_interior: [{ questId: "main-archive", newStage: "inspect_archive" }],
  observatory_interior: [{ questId: "main-signal", newStage: "scan_signal" }],
  cafeteria_interior: [{ questId: "side-cafeteria", newStage: "talk_to_staff" }],
};

export class QuestManager {
  constructor(private readonly client: GameHttpClient, private readonly playerId: string) {}

  onSceneEntered(sceneId: string): QuestUpdate[] {
    const updates = SCENE_QUEST_UPDATES[sceneId] ?? [];
    if (updates.length > 0) {
      void this.client.updatePlayerQuests(this.playerId, updates).catch(() => undefined);
    }
    return updates;
  }
}
