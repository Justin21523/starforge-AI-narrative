type KeyState = Record<string, boolean>;
type KeyPress = Set<string>;

export class InputManager {
  private keys: KeyState = {};
  private justPressed: KeyPress = new Set();

  constructor() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      this.justPressed.add(e.code);
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
      this.justPressed.delete(e.code);
    });
  }

  isPressed(code: string): boolean {
    return !!this.keys[code];
  }

  consumePress(code: string): boolean {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }
}
