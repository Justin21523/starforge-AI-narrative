"""
玩家與 NPC 狀態管理。
支援記憶體儲存（開發/測試）和資料庫儲存（生產）兩種模式。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Optional, TYPE_CHECKING

from app.game.schemas import (
    InternalEffects,
    NpcStats,
    PlayerStats,
)

if TYPE_CHECKING:
    from app.game.repositories.player_repository import PlayerRepository


class PlayerService:
    """
    玩家服務層。

    支援兩種模式：
    - 記憶體模式（use_in_memory=True）：開發/測試用
    - 資料庫模式（use_in_memory=False）：生產用
    """

    def __init__(
        self,
        base_npcs_path: Path,
        repository: Optional["PlayerRepository"] = None,
        use_in_memory: bool = True,
    ):
        self.base_npcs = self._load_base_npcs(base_npcs_path)
        self.repository = repository
        self.use_in_memory = use_in_memory or repository is None

        # 記憶體儲存（僅在 use_in_memory=True 時使用）
        self.players: Dict[str, PlayerStats] = {}
        self.npc_states: Dict[str, Dict[str, NpcStats]] = {}
        self.current_scene: Dict[str, str] = {}

    def _load_base_npcs(self, path: Path) -> Dict[str, NpcStats]:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        result: Dict[str, NpcStats] = {}
        for npc in data:
            initial = npc.get("initialStats", {})
            role_tags = npc.get("roleTags", [])
            result[npc["id"]] = NpcStats(
                friendship=initial.get("friendship", 0),
                trust=initial.get("trust", 0),
                role_tags=role_tags,
            )
        return result

    def _ensure_player(self, player_id: str) -> None:
        """確保玩家存在（記憶體模式）。"""
        if player_id not in self.players:
            # 預設中性值，避免全部從 0 開始。
            self.players[player_id] = PlayerStats(
                confidence=5, empathy=5, stress=5, reputation=5
            )
        if player_id not in self.npc_states:
            self.npc_states[player_id] = {
                npc_id: npc_state.model_copy(deep=True)
                for npc_id, npc_state in self.base_npcs.items()
            }

    def get_state(self, player_id: str) -> PlayerStats:
        """取得玩家屬性（同步，記憶體模式）。"""
        self._ensure_player(player_id)
        return self.players[player_id]

    async def get_state_async(self, player_id: str) -> PlayerStats:
        """取得玩家屬性（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            return self.get_state(player_id)
        return await self.repository.get_player_stats(player_id)

    def get_npc_state(self, player_id: str, npc_id: str) -> NpcStats:
        """取得 NPC 狀態（同步，記憶體模式）。"""
        self._ensure_player(player_id)
        if npc_id not in self.npc_states[player_id]:
            # 若找不到，給一個空白狀態，避免崩潰。
            self.npc_states[player_id][npc_id] = NpcStats(
                friendship=0, trust=0, role_tags=[]
            )
        return self.npc_states[player_id][npc_id]

    async def get_npc_state_async(self, player_id: str, npc_id: str) -> NpcStats:
        """取得 NPC 狀態（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            return self.get_npc_state(player_id, npc_id)
        default_stats = self.base_npcs.get(npc_id)
        return await self.repository.get_npc_state(player_id, npc_id, default_stats)

    def get_current_scene(self, player_id: str) -> str:
        """取得玩家當前場景（同步，記憶體模式）。"""
        self._ensure_player(player_id)
        return self.current_scene.get(player_id, "school_gate")

    async def get_current_scene_async(self, player_id: str) -> str:
        """取得玩家當前場景（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            return self.get_current_scene(player_id)
        return await self.repository.get_current_scene(player_id)

    def set_current_scene(self, player_id: str, scene_id: str) -> None:
        """設定玩家當前場景（同步，記憶體模式）。"""
        self._ensure_player(player_id)
        self.current_scene[player_id] = scene_id

    async def set_current_scene_async(self, player_id: str, scene_id: str) -> None:
        """設定玩家當前場景（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            self.set_current_scene(player_id, scene_id)
            return
        await self.repository.set_current_scene(player_id, scene_id)

    def apply_effects(
        self,
        player_id: str,
        npc_id: Optional[str],
        effects: Optional[InternalEffects],
    ) -> None:
        """套用對話效果（同步，記憶體模式）。"""
        if not effects:
            return
        self._ensure_player(player_id)

        # 更新玩家屬性
        if effects.player_stats_delta:
            player = self.players[player_id]
            for field, delta in effects.player_stats_delta.model_dump(
                exclude_none=True
            ).items():
                current = getattr(player, field, 0)
                setattr(player, field, current + delta)

        # 更新 NPC 屬性
        if npc_id and effects.npc_stats_delta:
            npc_state = self.get_npc_state(player_id, npc_id)
            for field, delta in effects.npc_stats_delta.model_dump(
                exclude_none=True
            ).items():
                current = getattr(npc_state, field, 0)
                setattr(npc_state, field, current + delta)

    async def apply_effects_async(
        self,
        player_id: str,
        npc_id: Optional[str],
        effects: Optional[InternalEffects],
    ) -> None:
        """套用對話效果（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            self.apply_effects(player_id, npc_id, effects)
            return

        base_npc_stats = self.base_npcs.get(npc_id) if npc_id else None
        await self.repository.apply_effects(player_id, npc_id, effects, base_npc_stats)

    def reset_player(self, player_id: str) -> None:
        """重置玩家狀態（記憶體模式）。"""
        if player_id in self.players:
            del self.players[player_id]
        if player_id in self.npc_states:
            del self.npc_states[player_id]
        if player_id in self.current_scene:
            del self.current_scene[player_id]

    async def reset_player_async(self, player_id: str) -> None:
        """重置玩家狀態（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            self.reset_player(player_id)
            return
        await self.repository.delete_player(player_id)
