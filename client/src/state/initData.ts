import { GameHttpClient } from "../api/gameClient";
import { loadNpc, loadScene } from "../data/loader";
import { appStore } from "./store";

export const hydrateFromBackend = async (playerId: string) => {
  const client = new GameHttpClient("/game");
  const [scenes, npcs, playerState, quests, questStates] = await Promise.all([
    client.fetchScenes(),
    client.fetchNpcs(),
    client.fetchPlayerState(playerId),
    client.fetchQuests(),
    client.fetchPlayerQuests(playerId),
  ]);
  appStore.setScenes(scenes);
  appStore.setNpcs(npcs);
  appStore.setQuests(quests);
  appStore.setQuestStates(questStates);

  const sceneId =
    playerState.sceneId || scenes[0]?.id || appStore.getState().game.sceneId;
  const scene = scenes.find((s) => s.id === sceneId) || loadScene(sceneId);
  if (scene) {
    appStore.setScene(scene.id, scene.name, scene.connections ?? []);
  }
  appStore.updatePlayerStats(playerState.playerStats);

  const firstNpcId = Object.keys(playerState.npcStates || {})[0] || npcs[0]?.id || "alex";
  const npcState = playerState.npcStates?.[firstNpcId];
  const npcDef = npcs.find((n) => n.id === firstNpcId) || loadNpc(firstNpcId);
  appStore.updateNpcStats({
    id: firstNpcId,
    name: npcDef?.name ?? appStore.getState().game.npc.name,
    friendship: npcState?.friendship ?? appStore.getState().game.npc.friendship,
    trust: npcState?.trust ?? appStore.getState().game.npc.trust,
    roleTags: npcState?.roleTags ?? npcDef?.roleTags ?? appStore.getState().game.npc.roleTags,
  });
};

export const hydrateFromLocal = () => {
  const state = appStore.getState();
  const scene = loadScene(state.game.sceneId);
  const npc = loadNpc(state.game.npc.id);
  if (scene) {
    appStore.setScene(scene.id, scene.name, scene.connections ?? state.game.sceneConnections);
  }
  if (npc) {
    appStore.updateNpcStats({
      id: npc.id,
      name: npc.name,
      roleTags: npc.roleTags,
    });
  }
};
