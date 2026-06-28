import type { InventoryItem } from "./InventoryManager";

export type Shop = {
  id: string;
  name: string;
  itemIds: string[];
};

export class ShopManager {
  private shops: Shop[] = [];

  async loadShops(): Promise<void> {
    this.shops = [
      { id: "merchant_shop", name: "Campus Supply", itemIds: ["starmap", "notebook", "signal_lens"] },
    ];
  }

  getShop(shopId: string): Shop {
    return this.shops.find((shop) => shop.id === shopId) ?? this.shops[0] ?? {
      id: shopId,
      name: "Field Supply",
      itemIds: ["starmap", "notebook", "signal_lens"],
    };
  }

  itemsForShop(shopId: string, allItems: InventoryItem[]): InventoryItem[] {
    const shop = this.getShop(shopId);
    return allItems.filter((item) => shop.itemIds.includes(item.id));
  }
}
