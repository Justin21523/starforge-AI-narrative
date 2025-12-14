import { InputManager } from "../core/InputManager";
import { appStore } from "../state/store";
import { AppConfig } from "../state/appConfig";
import { MockAiClient, HttpAiClient, AiClient } from "../api/aiClient";

export class AiDebugPanel {
  private visible = false;
  private input: InputManager;
  private onConfigChange: (newConfig: AppConfig) => void;

  constructor(input: InputManager, onConfigChange: (newConfig: AppConfig) => void) {
    this.input = input;
    this.onConfigChange = onConfigChange;
  }

  toggle() {
    this.visible = !this.visible;
  }

  isVisible() {
    return this.visible;
  }

  update() {
    if (!this.visible) return;

    // Toggle Mock AI with 'M' key when panel is open
    if (this.input.consumePress("KeyT")) {
      const current = appStore.getState().config.useMockAi;
      const next = !current;
      appStore.setConfig({ useMockAi: next });
      this.onConfigChange(appStore.getState().config);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return;

    const { width, height } = ctx.canvas;
    const panelW = 400;
    const panelH = height;
    const panelX = width - panelW;
    const panelY = 0;

    ctx.save();
    
    // Background
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX, 0);
    ctx.lineTo(panelX, height);
    ctx.stroke();

    // Title
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText("AI Debug Panel (Toggle: F1)", panelX + 20, 30);

    // Config
    const config = appStore.getState().config;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px monospace";
    ctx.fillText(`[T] Use Mock AI: ${config.useMockAi}`, panelX + 20, 60);

    // Logs
    const logs = appStore.getState().promptLog;
    let y = 100;

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Latest Interaction:", panelX + 20, y);
    y += 20;

    if (logs.length > 0) {
      const log = logs[0]; // Most recent
      
      // Prompt
      ctx.fillStyle = "#fbbf24";
      ctx.fillText("> Prompt (Truncated):", panelX + 20, y);
      y += 20;
      
      ctx.fillStyle = "#d1d5db";
      const promptLines = this.wrapText(ctx, log.prompt || "(No prompt)", panelW - 40);
      promptLines.slice(0, 10).forEach(line => {
        ctx.fillText(line, panelX + 20, y);
        y += 18;
      });
      if (promptLines.length > 10) {
        ctx.fillStyle = "#64748b";
        ctx.fillText("...", panelX + 20, y);
        y += 18;
      }
      y += 10;

      // NPC Response
      ctx.fillStyle = "#a3e635";
      ctx.fillText("> NPC Response:", panelX + 20, y);
      y += 20;
      
      ctx.fillStyle = "#d1d5db";
      const respLines = this.wrapText(ctx, log.npcText || "(No response)", panelW - 40);
      respLines.forEach(line => {
        ctx.fillText(line, panelX + 20, y);
        y += 18;
      });
      y += 10;

      // Tool Trace
      if (log.trace) {
         ctx.fillStyle = "#c084fc";
         ctx.fillText("> Tool Trace:", panelX + 20, y);
         y += 20;
         const traceStr = JSON.stringify(log.trace, null, 2);
         const traceLines = this.wrapText(ctx, traceStr, panelW - 40);
         ctx.fillStyle = "#94a3b8";
         traceLines.slice(0, 15).forEach(line => {
            ctx.fillText(line, panelX + 20, y);
            y += 16;
         });
      }

    } else {
      ctx.fillStyle = "#64748b";
      ctx.fillText("No interaction logs yet.", panelX + 20, y);
    }

    ctx.restore();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
  }
}
