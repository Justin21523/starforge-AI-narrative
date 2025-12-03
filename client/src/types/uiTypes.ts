import { DialogueResponse } from "../api/types";

export interface DevPanelState {
  lastAiResponse?: DialogueResponse;
  gameState: Record<string, unknown>;
}
