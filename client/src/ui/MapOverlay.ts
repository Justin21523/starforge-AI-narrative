type SelectCallback = (sceneId: string) => void;

const MAP_NODES = [
  { id: "campus_gate", name: "Campus Gate", x: 0, y: 0 },
  { id: "quad", name: "Central Quad", x: 1, y: 0 },
  { id: "library_interior", name: "Library", x: 0, y: 1 },
  { id: "observatory_interior", name: "Observatory", x: 1, y: 1 },
];

export class MapOverlay {
  private visible = false;
  private selectedIndex = 0;
  private onSelect?: SelectCallback;

  open(onSelect: SelectCallback): void {
    this.visible = true;
    this.selectedIndex = 0;
    this.onSelect = onSelect;
  }

  close(): void {
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  move(dx: number, dy: number): void {
    const current = MAP_NODES[this.selectedIndex];
    const next = MAP_NODES.findIndex((node) => node.x === current.x + dx && node.y === current.y + dy);
    if (next >= 0) this.selectedIndex = next;
  }

  confirm(): void {
    const node = MAP_NODES[this.selectedIndex];
    this.close();
    this.onSelect?.(node.id);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    const x = 180;
    const y = 90;
    const width = ctx.canvas.width - 360;
    const height = ctx.canvas.height - 180;

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "#a78bfa";
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 24px system-ui, sans-serif";
    ctx.fillText("Campus Map", x + 24, y + 42);

    MAP_NODES.forEach((node, index) => {
      const px = x + 130 + node.x * 220;
      const py = y + 115 + node.y * 130;
      ctx.fillStyle = index === this.selectedIndex ? "#facc15" : "#38bdf8";
      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(node.name, px - 48, py + 46);
    });

    ctx.font = "13px system-ui, sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("Arrow keys move. Enter travels. M/Esc closes.", x + 24, y + height - 24);
    ctx.restore();
  }
}
