type RelationshipChange = {
  type: "friendship" | "trust";
  delta: number;
  npcName: string;
};

type FloatingChange = RelationshipChange & {
  x: number;
  y: number;
  lifetime: number;
  age: number;
};

export class FriendshipIndicator {
  private changes: FloatingChange[] = [];

  showChange(change: RelationshipChange, x: number, y: number): void {
    this.changes.push({ ...change, x, y, lifetime: 2.2, age: 0 });
  }

  update(delta: number): void {
    this.changes = this.changes
      .map((change) => ({ ...change, age: change.age + delta, y: change.y - delta * 22 }))
      .filter((change) => change.age < change.lifetime);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    this.changes.forEach((change) => {
      const alpha = Math.max(0, 1 - change.age / change.lifetime);
      const positive = change.delta > 0;
      const label = `${change.npcName} ${change.type} ${positive ? "+" : ""}${change.delta}`;

      ctx.globalAlpha = alpha;
      ctx.font = "700 16px system-ui, sans-serif";
      const width = ctx.measureText(label).width + 28;
      this.roundRect(ctx, change.x - width / 2, change.y - 22, width, 34, 999);
      ctx.fillStyle = positive ? "rgba(20, 184, 166, 0.9)" : "rgba(239, 68, 68, 0.9)";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, change.x - width / 2 + 14, change.y);
    });
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

export class RelationshipPanel {
  private visible = false;
  private npcName = "";
  private friendship = 0;
  private trust = 0;
  private animation = 0;

  setNpc(npcName: string, friendship: number, trust: number): void {
    this.npcName = npcName;
    this.friendship = friendship;
    this.trust = trust;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  update(delta: number): void {
    const target = this.visible ? 1 : 0;
    const direction = target > this.animation ? 1 : -1;
    this.animation = Math.max(0, Math.min(1, this.animation + direction * delta * 6));
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.animation <= 0) return;

    const width = 260;
    const height = 112;
    const x = ctx.canvas.width - width - 18;
    const y = 68;

    ctx.save();
    ctx.globalAlpha = this.animation;
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.fillStyle = "rgba(15, 23, 42, 0.84)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.42)";
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 15px system-ui, sans-serif";
    ctx.fillText(this.npcName || "Companion", x + 16, y + 26);
    this.renderMeter(ctx, "Friendship", this.friendship, x + 16, y + 44, width - 32, "#38bdf8");
    this.renderMeter(ctx, "Trust", this.trust, x + 16, y + 76, width - 32, "#a78bfa");
    ctx.restore();
  }

  private renderMeter(ctx: CanvasRenderingContext2D, label: string, value: number, x: number, y: number, width: number, color: string): void {
    const clamped = Math.max(0, Math.min(100, value));
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(`${label}: ${Math.round(clamped)}`, x, y);
    ctx.fillStyle = "rgba(51, 65, 85, 0.9)";
    this.roundRect(ctx, x, y + 8, width, 8, 999);
    ctx.fill();
    ctx.fillStyle = color;
    this.roundRect(ctx, x, y + 8, width * (clamped / 100), 8, 999);
    ctx.fill();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
