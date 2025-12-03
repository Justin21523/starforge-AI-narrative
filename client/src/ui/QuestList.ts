import type { QuestDef } from "../types/dataTypes";

export const renderQuestList = (
  container: HTMLElement,
  quests: QuestDef[],
  questStates: Record<string, string>
) => {
  if (!container) return;
  container.innerHTML = "";
  const title = document.createElement("div");
  title.textContent = "Quests";
  title.style.fontWeight = "bold";
  title.style.marginBottom = "6px";
  container.appendChild(title);

  const list = document.createElement("div");
  quests.slice(0, 4).forEach((q) => {
    const state = questStates[q.id] || "not_started";
    const step = q.steps.find((s) => s.id === state);
    const row = document.createElement("div");
    row.textContent = `${q.title}: ${step?.description || state}`;
    row.style.marginBottom = "4px";
    list.appendChild(row);
  });
  container.appendChild(list);
};
