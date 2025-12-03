/**
 * AI Client wrapper providing HTTP and Mock implementations for easy frontend switching.
 */
import {
  DialogueRequest,
  DialogueResponse,
  InternalEffects,
} from "./types";

export interface AiClient {
  getNpcReply(req: DialogueRequest): Promise<DialogueResponse>;
}

export class HttpAiClient implements AiClient {
  constructor(private baseUrl = "/ai") {}

  async getNpcReply(req: DialogueRequest): Promise<DialogueResponse> {
    const response = await fetch(`${this.baseUrl}/dialogue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      throw new Error(`AI request failed with status ${response.status}`);
    }

    return (await response.json()) as DialogueResponse;
  }
}

export class MockAiClient implements AiClient {
  async getNpcReply(req: DialogueRequest): Promise<DialogueResponse> {
    const baseChoices = [
      "I'm doing okay.",
      "I'm a bit stressed.",
      "Can we talk later?",
    ];

    const effects: InternalEffects = {
      playerStatsDelta: { confidence: 1 },
      npcStatsDelta: { friendship: 1 },
      questUpdates: [],
    };

    return {
      npcText: `Mock: Hi ${req.playerId}, let's chat about ${req.sceneId}.`,
      suggestedPlayerChoices: baseChoices,
      internalEffects: effects,
    };
  }
}
