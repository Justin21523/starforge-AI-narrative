import { SceneManager } from "./SceneManager";
import { Scene } from "./types";

export class Game {
  private lastTimestamp = 0;
  private sceneManager = new SceneManager();

  constructor(private ctx: CanvasRenderingContext2D) {}

  setScene(scene: Scene) {
    this.sceneManager.setScene(scene);
  }

  start() {
    requestAnimationFrame(this.loop);
  }

  private loop = (timestamp: number) => {
    const delta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    this.update(delta);
    this.render();
    requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    this.sceneManager.update(delta);
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.sceneManager.render(ctx);
  }
}
