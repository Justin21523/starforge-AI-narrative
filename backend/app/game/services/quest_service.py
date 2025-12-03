"""
任務狀態管理。
支援記憶體儲存（開發/測試）和資料庫儲存（生產）兩種模式。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, TYPE_CHECKING

from app.game.schemas import QuestUpdate

if TYPE_CHECKING:
    from app.game.repositories.quest_repository import QuestRepository


class QuestService:
    """
    任務服務層。

    支援兩種模式：
    - 記憶體模式（use_in_memory=True）：開發/測試用
    - 資料庫模式（use_in_memory=False）：生產用
    """

    def __init__(
        self,
        base_quests_path: Path,
        repository: Optional["QuestRepository"] = None,
        use_in_memory: bool = True,
    ):
        self.base_quests = self._load_base_quests(base_quests_path)
        self.repository = repository
        self.use_in_memory = use_in_memory or repository is None

        # 記憶體儲存（僅在 use_in_memory=True 時使用）
        self.player_quests: Dict[str, Dict[str, str]] = {}

    def _load_base_quests(self, path: Path) -> Dict[str, dict]:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {q["id"]: q for q in data}

    def _ensure_player(self, player_id: str) -> None:
        """確保玩家任務狀態存在（記憶體模式）。"""
        if player_id not in self.player_quests:
            # 預設都尚未開始
            self.player_quests[player_id] = {
                quest_id: "not_started" for quest_id in self.base_quests.keys()
            }

    def get_quest_stage(self, player_id: str, quest_id: str) -> str:
        """取得任務進度（同步，記憶體模式）。"""
        self._ensure_player(player_id)
        return self.player_quests[player_id].get(quest_id, "not_started")

    async def get_quest_stage_async(self, player_id: str, quest_id: str) -> str:
        """取得任務進度（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            return self.get_quest_stage(player_id, quest_id)
        return await self.repository.get_quest_stage(player_id, quest_id)

    def apply_updates(self, player_id: str, updates: List[QuestUpdate]) -> None:
        """套用任務更新（同步，記憶體模式）。"""
        self._ensure_player(player_id)
        for upd in updates:
            self.player_quests[player_id][upd.quest_id] = upd.new_stage

    async def apply_updates_async(self, player_id: str, updates: List[QuestUpdate]) -> None:
        """套用任務更新（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            self.apply_updates(player_id, updates)
            return
        await self.repository.apply_updates(player_id, updates)

    def get_all_states(self, player_id: str) -> Dict[str, str]:
        """取得玩家所有任務進度（同步，記憶體模式）。"""
        self._ensure_player(player_id)
        return self.player_quests[player_id]

    async def get_all_states_async(self, player_id: str) -> Dict[str, str]:
        """取得玩家所有任務進度（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            return self.get_all_states(player_id)
        base_quest_ids = list(self.base_quests.keys())
        return await self.repository.get_all_quest_states(player_id, base_quest_ids)

    def reset_player_quests(self, player_id: str) -> None:
        """重置玩家任務進度（記憶體模式）。"""
        if player_id in self.player_quests:
            del self.player_quests[player_id]

    async def reset_player_quests_async(self, player_id: str) -> None:
        """重置玩家任務進度（非同步，支援資料庫模式）。"""
        if self.use_in_memory:
            self.reset_player_quests(player_id)
            return
        await self.repository.delete_player_quests(player_id)
