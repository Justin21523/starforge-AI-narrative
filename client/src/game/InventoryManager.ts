export type InventoryItem = {
  id: string;
  name: string;
  price: number;
  description: string;
};

export class InventoryManager {
  private items: InventoryItem[] = [];
  private owned = new Set<string>();
  private gold = 120;

  async loadItems(): Promise<void> {
    this.items = [
      { id: "starmap", name: "Annotated Star Map", price: 45, description: "Reveals route hints during exploration." },
      { id: "notebook", name: "Field Notebook", price: 30, description: "Stores dialogue clues and quest notes." },
      { id: "signal_lens", name: "Signal Lens", price: 60, description: "Improves anomaly scanning scenes." },
    ];
  }

  listItems(): InventoryItem[] {
    return this.items;
  }

  getGold(): number {
    return this.gold;
  }

  buy(itemId: string): boolean {
    const item = this.items.find((candidate) => candidate.id === itemId);
    if (!item || this.owned.has(item.id) || this.gold < item.price) return false;
    this.gold -= item.price;
    this.owned.add(item.id);
    return true;
  }

  has(itemId: string): boolean {
    return this.owned.has(itemId);
  }
}
