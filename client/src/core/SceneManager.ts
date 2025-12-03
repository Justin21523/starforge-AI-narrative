import { Scene } from "./types";

export type TransitionType = "fade" | "none";

/**
 * Enhanced SceneManager with scene stack and transitions.
 */
export class SceneManager {
  private currentScene: Scene | null = null;
  private sceneStack: Scene[] = [];

  // Transition state
  private transitioning = false;
  private transitionType: TransitionType = "none";
  private transitionProgress = 0;
  private transitionDuration = 0.5; // seconds
  private transitionPhase: "out" | "in" = "out";
  private pendingScene: Scene | null = null;

  /**
   * Set the current scene (replaces current, clears stack).
   */
  setScene(scene: Scene, transition: TransitionType = "none") {
    if (transition === "none") {
      this.currentScene?.onExit?.();
      this.currentScene = scene;
      this.sceneStack = [];
      scene.onEnter?.();
    } else {
      this.startTransition(scene, transition, false);
    }
  }

  /**
   * Push a scene onto the stack (e.g., dialogue overlay).
   */
  pushScene(scene: Scene) {
    if (this.currentScene) {
      this.currentScene.onPause?.();
      this.sceneStack.push(this.currentScene);
    }
    this.currentScene = scene;
    scene.onEnter?.();
  }

  /**
   * Pop the current scene and return to the previous one.
   */
  popScene(): Scene | null {
    const popped = this.currentScene;
    popped?.onExit?.();

    this.currentScene = this.sceneStack.pop() || null;
    this.currentScene?.onResume?.();

    return popped;
  }

  /**
   * Get the current active scene.
   */
  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * Check if a transition is in progress.
   */
  isTransitioning(): boolean {
    return this.transitioning;
  }

  /**
   * Start a transition to a new scene.
   */
  private startTransition(scene: Scene, type: TransitionType, push: boolean) {
    this.transitioning = true;
    this.transitionType = type;
    this.transitionProgress = 0;
    this.transitionPhase = "out";
    this.pendingScene = scene;
  }

  update(delta: number) {
    // Handle transition
    if (this.transitioning) {
      this.transitionProgress += delta / this.transitionDuration;

      if (this.transitionPhase === "out" && this.transitionProgress >= 1) {
        // Switch scenes at midpoint
        this.currentScene?.onExit?.();
        this.currentScene = this.pendingScene;
        this.sceneStack = [];
        this.currentScene?.onEnter?.();
        this.transitionPhase = "in";
        this.transitionProgress = 0;
      } else if (this.transitionPhase === "in" && this.transitionProgress >= 1) {
        // Transition complete
        this.transitioning = false;
        this.pendingScene = null;
      }
    }

    this.currentScene?.update(delta);
  }

  render(ctx: CanvasRenderingContext2D) {
    // Render scene stack (bottom to top) if needed
    // For now, just render current scene
    this.currentScene?.render(ctx);

    // Render transition overlay
    if (this.transitioning && this.transitionType === "fade") {
      this.renderFadeTransition(ctx);
    }
  }

  /**
   * Render fade transition overlay.
   */
  private renderFadeTransition(ctx: CanvasRenderingContext2D) {
    const { width, height } = ctx.canvas;
    let alpha: number;

    if (this.transitionPhase === "out") {
      // Fade to black
      alpha = this.transitionProgress;
    } else {
      // Fade from black
      alpha = 1 - this.transitionProgress;
    }

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, Math.max(0, alpha))})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
