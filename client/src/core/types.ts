/**
 * Scene interface for game scenes.
 */
export interface Scene {
  /** Called every frame with delta time in seconds */
  update(delta: number): void;

  /** Called every frame to render the scene */
  render(ctx: CanvasRenderingContext2D): void;

  /** Called when scene becomes active */
  onEnter?(): void;

  /** Called when scene is being left */
  onExit?(): void;

  /** Called when another scene is pushed on top */
  onPause?(): void;

  /** Called when returning from a pushed scene */
  onResume?(): void;
}
