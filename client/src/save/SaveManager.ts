/**
 * Save Manager - handles game progress persistence using localStorage
 */

export interface SaveData {
  version: number;
  timestamp: number;
  playerId: string;
  slot: number;
  gameState: {
    sceneId: string;
    sceneName: string;
    player: {
      x: number;
      confidence: number;
      empathy: number;
      stress: number;
      reputation: number;
    };
    npc: {
      id: string;
      name: string;
      friendship: number;
      trust: number;
    };
    questStates: Record<string, string>;
  };
}

const SAVE_KEY_PREFIX = "starforge_save_";
const CURRENT_VERSION = 1;
const MAX_SLOTS = 3;

export class SaveManager {
  private playerId: string;
  private slot: number;

  constructor(playerId: string, slot: number = 0) {
    this.playerId = playerId;
    this.slot = slot;
  }

  private get saveKey(): string {
    return `${SAVE_KEY_PREFIX}${this.playerId}_slot_${this.slot}`;
  }

  setSlot(slot: number): void {
    this.slot = Math.max(0, Math.min(slot, MAX_SLOTS - 1));
  }

  getSlot(): number {
    return this.slot;
  }

  static getMaxSlots(): number {
    return MAX_SLOTS;
  }

  /**
   * Save current game state to localStorage
   */
  save(gameState: SaveData["gameState"]): boolean {
    try {
      const saveData: SaveData = {
        version: CURRENT_VERSION,
        timestamp: Date.now(),
        playerId: this.playerId,
        slot: this.slot,
        gameState,
      };
      localStorage.setItem(this.saveKey, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error("Failed to save game:", error);
      return false;
    }
  }

  /**
   * Load game state from localStorage
   */
  load(): SaveData | null {
    try {
      const data = localStorage.getItem(this.saveKey);
      if (!data) return null;

      const saveData: SaveData = JSON.parse(data);

      // Version check for future migrations
      if (saveData.version !== CURRENT_VERSION) {
        console.warn("Save version mismatch, may need migration");
      }

      return saveData;
    } catch (error) {
      console.error("Failed to load save:", error);
      return null;
    }
  }

  /**
   * Check if a save exists
   */
  hasSave(): boolean {
    return localStorage.getItem(this.saveKey) !== null;
  }

  /**
   * Delete save data
   */
  deleteSave(): boolean {
    try {
      localStorage.removeItem(this.saveKey);
      return true;
    } catch (error) {
      console.error("Failed to delete save:", error);
      return false;
    }
  }

  /**
   * Get all save slots for a player
   */
  static getSlotsForPlayer(playerId: string): (SaveData | null)[] {
    const slots: (SaveData | null)[] = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      const key = `${SAVE_KEY_PREFIX}${playerId}_slot_${i}`;
      try {
        const data = localStorage.getItem(key);
        if (data) {
          slots.push(JSON.parse(data));
        } else {
          slots.push(null);
        }
      } catch {
        slots.push(null);
      }
    }
    return slots;
  }

  /**
   * Get all saves across all players
   */
  static getAllSaves(): SaveData[] {
    const saves: SaveData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SAVE_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            saves.push(JSON.parse(data));
          }
        } catch {
          // Skip corrupted saves
        }
      }
    }
    return saves.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
}
