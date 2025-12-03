/**
 * Simple dialogue overlay that renders NPC text and player choices.
 */
export class DialogueOverlay {
  private npcText = "";
  private choices: string[] = [];
  private loading = false;
  private selected = 0;
  private scrollOffset = 0;

  setDialogue(npcText: string, choices: string[]) {
    this.npcText = npcText;
    this.choices = choices;
    this.loading = false;
    this.selected = 0;
    this.scrollOffset = 0;
  }

  setLoading(flag: boolean) {
    this.loading = flag;
  }

  moveSelection(delta: number) {
    if (!this.choices.length) return;
    const next = (this.selected + delta + this.choices.length) % this.choices.length;
    this.selected = next;
  }

  getSelectedChoice(): string | null {
    if (!this.choices.length) return null;
    return this.choices[this.selected];
  }

  render(ctx: CanvasRenderingContext2D) {
    const { width, height } = ctx.canvas;
    const boxHeight = 140;
    const padding = 16;
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(0, height - boxHeight, width, boxHeight);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "16px Arial";
    const text = this.loading ? "..." : this.npcText;
    if (this.loading) {
      ctx.fillText("...", padding, height - boxHeight + 28);
      ctx.restore();
      return;
    }

    // Scroll to display long text
    const maxWidth = width - padding * 2;
    const lines = this.wrapText(ctx, text, maxWidth);
    const lineHeight = 18;
    const maxLines = 3;
    const startY = height - boxHeight + 28;
    const visible = lines.slice(this.scrollOffset, this.scrollOffset + maxLines);
    visible.forEach((line, idx) => {
      ctx.fillText(line, padding, startY + idx * lineHeight);
    });

    this.choices.forEach((choice, idx) => {
      const y = height - boxHeight + 56 + idx * 20;
      const selected = idx === this.selected;
      ctx.fillStyle = selected ? "#e5e7eb" : "#94a3b8";
      ctx.fillText(`${selected ? "➤" : "•"} ${choice}`, 16, y);
    });
    ctx.restore();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }
}
