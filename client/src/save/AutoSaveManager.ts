import { appStore } from "../state/store";

class AutoSaveManager {
  constructor(private readonly playerId: string) {}

  onSceneChange(sceneId: string): void {
    try {
      localStorage.setItem(`starforge-autosave-${this.playerId}`, JSON.stringify({
        sceneId,
        savedAt: new Date().toISOString(),
        game: appStore.getState().game,
      }));
    } catch {
      // localStorage can be unavailable in private contexts.
    }
  }
}

const managers = new Map<string, AutoSaveManager>();

export function getAutoSaveManager(playerId: string): AutoSaveManager {
  if (!managers.has(playerId)) managers.set(playerId, new AutoSaveManager(playerId));
  return managers.get(playerId)!;
}
