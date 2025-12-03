import type { QuestDef } from "../types/dataTypes";

export const renderQuestPanel = (container: HTMLElement, quests: QuestDef[], questStates: Record<string, string>) => {
  if (!container) return;
  const active = quests.find((q) => questStates[q.id] && questStates[q.id] !== "completed") ?? quests[0];
  if (!active) {
    container.textContent = "No quests.";
    return;
  }
  const stage = questStates[active.id] || "not_started";
  const step = active.steps.find((s) => s.id === stage);
  container.textContent = `Quest: ${active.title} — ${step?.description || stage}`;
};
