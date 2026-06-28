import type { BuildingDef } from "../types/dataTypes";

const ENTRANCES: Record<string, BuildingDef[]> = {
  campus_gate: [
    { id: "library", name: "Library Archive", x: 260, width: 90, targetSceneId: "library_interior" },
    { id: "cafeteria", name: "Cafeteria", x: 620, width: 100, targetSceneId: "cafeteria_interior" },
  ],
  quad: [
    { id: "observatory", name: "Observatory Lab", x: 420, width: 110, targetSceneId: "observatory_interior" },
  ],
};

export class BuildingEntranceManager {
  private entrances: BuildingDef[] = [];

  loadEntrances(sceneId: string): void {
    this.entrances = ENTRANCES[sceneId] ?? [
      { id: `${sceneId}-hall`, name: "Field Station", x: 480, width: 96, targetSceneId: `${sceneId}_interior` },
    ];
  }

  checkProximity(playerX: number): { entrance: BuildingDef | null; distance: number } {
    let closest: BuildingDef | null = null;
    let distance = Infinity;
    for (const entrance of this.entrances) {
      const center = entrance.x + entrance.width / 2;
      const nextDistance = Math.abs(center - playerX);
      if (nextDistance < 70 && nextDistance < distance) {
        closest = entrance;
        distance = nextDistance;
      }
    }
    return { entrance: closest, distance };
  }

  renderEntrances(ctx: CanvasRenderingContext2D, playerX: number, height: number): void {
    const proximity = this.checkProximity(playerX).entrance;
    this.entrances.forEach((entrance) => {
      const y = height - 186;
      ctx.save();
      ctx.fillStyle = entrance === proximity ? "rgba(250, 204, 21, 0.34)" : "rgba(15, 23, 42, 0.5)";
      ctx.fillRect(entrance.x, y, entrance.width, 118);
      ctx.strokeStyle = entrance === proximity ? "#facc15" : "rgba(148, 163, 184, 0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(entrance.x, y, entrance.width, 118);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.fillText(entrance.name, entrance.x + 8, y - 8);
      if (entrance === proximity) {
        ctx.fillStyle = "#facc15";
        ctx.fillText("Press E", entrance.x + 18, y + 64);
      }
      ctx.restore();
    });
  }
}
