import { InputManager } from "../core/InputManager";
import { InventoryManager } from "../game/InventoryManager";
import { ShopManager } from "../game/ShopManager";

export class ShopUI {
  private visible = false;
  private shopId = "merchant_shop";
  private selectedIndex = 0;
  private message = "Enter buys an item. Esc closes the shop.";

  constructor(
    private readonly input: InputManager,
    private readonly inventory: InventoryManager,
    private readonly shops: ShopManager
  ) {}

  open(shopId: string): void {
    this.shopId = shopId;
    this.visible = true;
    this.selectedIndex = 0;
    this.message = "Enter buys an item. Esc closes the shop.";
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(): void {
    const items = this.shops.itemsForShop(this.shopId, this.inventory.listItems());
    if (this.input.consumePress("Escape")) this.visible = false;
    if (this.input.consumePress("ArrowUp")) this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    if (this.input.consumePress("ArrowDown")) this.selectedIndex = Math.min(items.length - 1, this.selectedIndex + 1);
    if (this.input.consumePress("Enter") && items[this.selectedIndex]) {
      const item = items[this.selectedIndex];
      this.message = this.inventory.buy(item.id) ? `Purchased ${item.name}` : `Cannot buy ${item.name}`;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    const items = this.shops.itemsForShop(this.shopId, this.inventory.listItems());
    const x = 170;
    const y = 110;
    const width = ctx.canvas.width - 340;
    const height = 340;

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 24px system-ui, sans-serif";
    ctx.fillText(this.shops.getShop(this.shopId).name, x + 24, y + 42);
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(`Gold: ${this.inventory.getGold()}`, x + width - 120, y + 42);

    items.forEach((item, index) => {
      const top = y + 78 + index * 58;
      ctx.fillStyle = index === this.selectedIndex ? "rgba(56, 189, 248, 0.2)" : "rgba(30, 41, 59, 0.55)";
      ctx.fillRect(x + 20, top, width - 40, 48);
      ctx.fillStyle = this.inventory.has(item.id) ? "#94a3b8" : "#f8fafc";
      ctx.font = "700 14px system-ui, sans-serif";
      ctx.fillText(`${item.name} - ${item.price}g`, x + 34, top + 19);
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(item.description, x + 34, top + 38);
    });

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(this.message, x + 24, y + height - 24);
    ctx.restore();
  }
}
