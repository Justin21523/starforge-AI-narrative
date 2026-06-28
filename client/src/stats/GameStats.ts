class GameStats {
  private sceneVisits = new Map<string, number>();
  private dialogues = new Map<string, number>();
  private eventCount = 0;
  private eventChoices = 0;
  private dialogueChoices = 0;

  recordSceneVisit(sceneId: string): void {
    this.sceneVisits.set(sceneId, (this.sceneVisits.get(sceneId) ?? 0) + 1);
  }

  recordDialogue(npcId: string): void {
    this.dialogues.set(npcId, (this.dialogues.get(npcId) ?? 0) + 1);
  }

  recordEventTriggered(): void {
    this.eventCount += 1;
  }

  recordEventChoice(): void {
    this.eventChoices += 1;
  }

  recordDialogueChoice(): void {
    this.dialogueChoices += 1;
  }

  snapshot(): Record<string, unknown> {
    return {
      sceneVisits: Object.fromEntries(this.sceneVisits),
      dialogues: Object.fromEntries(this.dialogues),
      eventCount: this.eventCount,
      eventChoices: this.eventChoices,
      dialogueChoices: this.dialogueChoices,
    };
  }
}

const stats = new GameStats();

export function getGameStats(): GameStats {
  return stats;
}
