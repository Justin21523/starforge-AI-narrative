"""
場景資料管理，讀取本地 JSON 並提供查詢。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional


class SceneService:
    def __init__(self, base_scenes_path: Path):
        self.scenes = self._load_scenes(base_scenes_path)
        self.current_scene: Dict[str, str] = {}

    def _load_scenes(self, path: Path) -> Dict[str, dict]:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {scene["id"]: scene for scene in data}

    def get_scene(self, scene_id: str) -> Optional[dict]:
        """取得場景資料。"""
        return self.scenes.get(scene_id)

    def list_all(self) -> List[dict]:
        """列出所有場景。"""
        return list(self.scenes.values())

    def get_connections(self, scene_id: str) -> List[str]:
        """取得場景連接的其他場景 ID 列表。"""
        scene = self.scenes.get(scene_id)
        if scene:
            return scene.get("connections", [])
        return []

    def get_current_scene(self, player_id: str) -> Optional[str]:
        """取得玩家當前場景。"""
        return self.current_scene.get(player_id)

    def set_current_scene(self, player_id: str, scene_id: str) -> None:
        """設定玩家當前場景。"""
        if scene_id in self.scenes:
            self.current_scene[player_id] = scene_id
