import { Scene } from "../../core/types";
import { SceneManager } from "../../core/SceneManager";
import { InputManager } from "../../core/InputManager";
import { appStore } from "../../state/store";

/**
 * Abstract base class for all game scenes.
 * Provides common functionality and enforces consistent scene structure.
 */
export abstract class BaseScene implements Scene {
  protected sceneManager: SceneManager;
  protected input: InputManager;
  protected imageCache = new Map<string, HTMLImageElement>();

  constructor(sceneManager: SceneManager, inputManager: InputManager) {
    this.sceneManager = sceneManager;
    this.input = inputManager;
  }

  /**
   * Called every frame with delta time in seconds.
   */
  abstract update(delta: number): void;

  /**
   * Called every frame to render the scene.
   */
  abstract render(ctx: CanvasRenderingContext2D): void;

  /**
   * Called when scene becomes active.
   */
  onEnter(): void {
    // Override in subclass if needed
  }

  /**
   * Called when scene is being left.
   */
  onExit(): void {
    // Override in subclass if needed
  }

  /**
   * Called when another scene is pushed on top.
   */
  onPause(): void {
    // Override in subclass if needed
  }

  /**
   * Called when returning from a pushed scene.
   */
  onResume(): void {
    // Override in subclass if needed
  }

  /**
   * Load and cache an image.
   */
  protected getImage(key: string, src: string): HTMLImageElement | null {
    if (this.imageCache.has(key)) {
      return this.imageCache.get(key)!;
    }
    const img = new Image();
    img.src = src;
    this.imageCache.set(key, img);
    return img;
  }

  /**
   * Generate gradient colors based on scene ID hash.
   */
  protected sceneColors(sceneId: string): [string, string] {
    const hash = Array.from(sceneId).reduce(
      (acc, c) => acc + c.charCodeAt(0),
      0
    );
    const hue1 = hash % 360;
    const hue2 = (hash * 3) % 360;
    return [`hsl(${hue1}, 45%, 30%)`, `hsl(${hue2}, 50%, 15%)`];
  }

  /**
   * Render scene background (image or gradient fallback).
   */
  protected renderBackground(
    ctx: CanvasRenderingContext2D,
    sceneId: string,
    sceneName: string
  ): void {
    const { width, height } = ctx.canvas;
    const scenes = appStore.getState().scenes;
    const sceneDef = scenes.find((s) => s.id === sceneId);
    const imageUrl = sceneDef?.backgroundImage;
    const cacheKey = imageUrl || sceneId;

    if (imageUrl) {
      const img = this.getImage(cacheKey, imageUrl);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, width, height);
        return;
      }
    }

    // Fallback to gradient
    this.renderGradient(ctx, sceneId, sceneName);
  }

  /**
   * Render gradient background.
   */
  protected renderGradient(
    ctx: CanvasRenderingContext2D,
    sceneId: string,
    sceneName: string
  ): void {
    const { width, height } = ctx.canvas;
    const [colorTop, colorBottom] = this.sceneColors(sceneId);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, colorTop);
    gradient.addColorStop(1, colorBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (sceneName) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.font = "32px Arial";
      ctx.fillText(sceneName, 16, 48);
    }
  }

  /**
   * Render floor area.
   */
  protected renderFloor(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, height - 80, width, 80);
  }
}
