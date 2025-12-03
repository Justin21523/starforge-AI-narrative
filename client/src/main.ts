import { Game } from "./core/Game";
import { SceneManager } from "./core/SceneManager";
import { TitleScene } from "./game/scenes/TitleScene";
import { defaultConfig } from "./state/appConfig";
import { InputManager } from "./core/InputManager";
import type { AppConfig } from "./state/appConfig";
import { GameHttpClient } from "./api/gameClient";
import { appStore } from "./state/store";
import { hydrateFromBackend as hydrateBackend, hydrateFromLocal } from "./state/initData";
import { renderQuestPanel } from "./ui/QuestPanel";
import { renderQuestList } from "./ui/QuestList";
import { ToastManager } from "./ui/Toast";
import { getAudioManager } from "./audio/AudioManager";
import { loadGameSettings } from "./ui/SettingsPanel";
import { initLanguageFromSettings } from "./i18n/i18n";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
const hudStats = document.getElementById("player-stats");
const hudScene = document.getElementById("scene-name");
const hudQuest = document.getElementById("quest-info");
const toggleAiButton = document.getElementById("toggle-ai") as HTMLButtonElement | null;
const loreInput = document.getElementById("lore-input") as HTMLInputElement | null;
const loreBtn = document.getElementById("lore-btn") as HTMLButtonElement | null;
const loreResults = document.getElementById("lore-results");
const devState = document.getElementById("dev-state");
const promptTrace = document.getElementById("prompt-trace");
const copyPromptBtn = document.getElementById("copy-prompt") as HTMLButtonElement | null;
const copyTraceBtn = document.getElementById("copy-trace") as HTMLButtonElement | null;
const clearLogBtn = document.getElementById("clear-log") as HTMLButtonElement | null;
const questListContainer = document.getElementById("quest-list");
const toastContainer = document.getElementById("toast-container");
const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement | null;

if (!canvas) {
  throw new Error("Canvas element #game not found");
}

const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = Math.floor(window.innerHeight * 0.6);
};

resize();
window.addEventListener("resize", resize);

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Canvas 2D context not available");
}

const game = new Game(ctx);
const sceneManager = new SceneManager();
const input = new InputManager();
const config: AppConfig = { ...defaultConfig };
const playerId = "player-001";
const httpClient = new GameHttpClient("/game");
const toastManager = toastContainer ? new ToastManager(toastContainer) : undefined;
appStore.subscribe(() => renderHud());

const mountScene = () => {
  const titleScene = new TitleScene(sceneManager, input, config, toastManager);
  sceneManager.setScene(titleScene, "fade");
  game.setScene(titleScene);
};

const renderHud = () => {
  const state = appStore.getState().game;
  if (hudStats) {
    hudStats.textContent = `CONF ${state.player.confidence} | EMP ${state.player.empathy} | STR ${state.player.stress} | REP ${state.player.reputation}`;
  }
  if (hudScene) {
    hudScene.textContent = `Scene: ${state.sceneId} (${state.sceneName})`;
  }
  if (hudQuest) {
    renderQuestPanel(hudQuest, appStore.getState().quests, appStore.getState().game.questStates);
  }
  if (questListContainer) {
    renderQuestList(
      questListContainer,
      appStore.getState().quests,
      appStore.getState().game.questStates
    );
  }
  if (devState) {
    const { lastAiResponse } = appStore.getState();
    devState.textContent = JSON.stringify(
      {
        scene: state.sceneId,
        npc: state.npc,
        lastAiResponse,
      },
      null,
      2
    );
  }
  if (promptTrace) {
    const log = appStore.getState().promptLog;
    const lines = log.map((entry, idx) => {
      const traceText = (entry.trace || [])
        .map((t: any) => `  - ${t.tool}: ${JSON.stringify(t.output)}${t.error ? " [error: " + t.error + "]" : ""}`)
        .join("\n");
      return `#${idx + 1}\nPrompt:\n${entry.prompt || ""}\nNPC:\n${entry.npcText || ""}\nTrace:\n${traceText}`;
    });
    promptTrace.textContent = lines.join("\n\n---\n\n");
  }
};

const initFromBackend = async () => {
  try {
    await hydrateBackend(playerId);
  } catch (err) {
    console.warn("Fallback to local data due to backend init error", err);
    hydrateFromLocal();
  }
};

// Initialize audio on first user interaction (browser autoplay policy)
let audioInitialized = false;
const initAudio = async () => {
  if (audioInitialized) return;
  audioInitialized = true;

  const audio = getAudioManager();
  await audio.init();

  // Apply saved settings
  const settings = loadGameSettings();
  audio.setBgmVolume(settings.bgmVolume);
  audio.setSfxVolume(settings.sfxVolume);

  // Remove listeners after init
  document.removeEventListener("click", initAudio);
  document.removeEventListener("keydown", initAudio);
};

document.addEventListener("click", initAudio, { once: true });
document.addEventListener("keydown", initAudio, { once: true });

const bootstrap = async () => {
  // Initialize language from saved settings
  const settings = loadGameSettings();
  initLanguageFromSettings(settings.language);

  if (!config.useMockAi) {
    await initFromBackend();
  } else {
    hydrateFromLocal();
  }
  renderHud();
  mountScene();
  game.start();
  updateAiButton();
};

const updateAiButton = () => {
  if (toggleAiButton) {
    toggleAiButton.textContent = `AI Mode: ${config.useMockAi ? "Mock" : "HTTP"}`;
  }
};

updateAiButton();
toggleAiButton?.addEventListener("click", () => {
  config.useMockAi = !config.useMockAi;
  updateAiButton();
  if (config.useMockAi) {
    hydrateFromLocal();
    mountScene();
  } else {
    initFromBackend().then(() => mountScene()).catch(() => {
      hydrateFromLocal();
      mountScene();
    });
  }
});

const wireLoreSearch = () => {
  const handler = async () => {
    if (!loreInput || !loreResults) return;
    const query = loreInput.value.trim() || "bullying safety";
    loreResults.textContent = "Searching...";
    try {
      const result = await httpClient.searchLore(query);
      loreResults.textContent = result.hits
        .map((h) => `- ${h.text}`)
        .join("\n");
    } catch (err) {
      loreResults.textContent = `Error: ${(err as Error).message}`;
    }
  };
  loreBtn?.addEventListener("click", handler);
};

wireLoreSearch();
resetBtn?.addEventListener("click", async () => {
  loreResults!.textContent = "Resetting...";
  await fetch(`/reset/${playerId}`, { method: "POST" }).catch(() => undefined);
  hydrateFromLocal();
  mountScene();
  renderHud();
  loreResults!.textContent = "Reset done (mock in-memory).";
});

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toastManager?.add("Copied to clipboard");
  } catch {
    toastManager?.add("Copy failed");
  }
};

copyPromptBtn?.addEventListener("click", () => {
  const prompt = appStore.getState().lastAiResponse?.meta?.prompt || "";
  void copyText(prompt);
});

copyTraceBtn?.addEventListener("click", () => {
  const trace = appStore.getState().lastAiResponse?.meta?.trace || [];
  const traceText = trace
    .map((t) => `${t.tool}: ${JSON.stringify(t.output)}${t.error ? " [error: " + t.error + "]" : ""}`)
    .join("\n");
  void copyText(traceText);
});

clearLogBtn?.addEventListener("click", () => {
  appStore.clearPromptLog();
  renderHud();
});
bootstrap();
