type Toast = { id: number; text: string; expiresAt: number };

export class ToastManager {
  private container: HTMLElement;
  private toasts: Toast[] = [];
  private nextId = 1;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  add(text: string, durationMs = 2500) {
    const id = this.nextId++;
    const expiresAt = Date.now() + durationMs;
    this.toasts.push({ id, text, expiresAt });
    this.render();
    setTimeout(() => this.expire(id), durationMs);
  }

  private expire(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.render();
  }

  private render() {
    this.container.innerHTML = "";
    this.toasts.forEach((toast) => {
      const div = document.createElement("div");
      div.textContent = toast.text;
      div.style.background = "#111827";
      div.style.border = "1px solid #1f2937";
      div.style.color = "#e2e8f0";
      div.style.padding = "6px 10px";
      div.style.marginTop = "6px";
      div.style.borderRadius = "6px";
      div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.35)";
      this.container.appendChild(div);
    });
  }
}
