import { BaseScene } from "./BaseScene";
import { SceneManager } from "../../core/SceneManager";
import { InputManager } from "../../core/InputManager";

export class InteriorScene extends BaseScene {
  constructor(
    sceneManager: SceneManager,
    inputManager: InputManager,
    private readonly sceneId: string,
    private readonly exitX: number
  ) {
    super(sceneManager, inputManager);
  }

  update(): void {
    if (this.input.consumePress("Escape") || this.input.consumePress("KeyE")) {
      this.sceneManager.popScene();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#111827");
    gradient.addColorStop(1, "#312e81");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.fillRect(120, 120, width - 240, height - 240);
    ctx.strokeStyle = "#818cf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 120, width - 240, height - 240);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 28px system-ui, sans-serif";
    ctx.fillText(this.sceneId.replace(/_/g, " "), 150, 170);
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText("Inspect the room, then press E or Esc to return outside.", 150, 205);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(this.exitX, height - 170, 64, 90);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillText("EXIT", this.exitX + 14, height - 120);
  }
}
