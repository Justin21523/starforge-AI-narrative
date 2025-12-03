"""
讀取遊戲狀態的工具，透過 service layer 取得玩家與 NPC 屬性與任務狀態。
"""
from typing import Any, Dict, Optional

from app.game.services.player_service import PlayerService
from app.game.services.quest_service import QuestService


class GetGameStateTool:
    name = "get_game_state"
    description = "Fetch current player, npc, and quest state for reasoning."

    def __init__(self, player_service: PlayerService, quest_service: QuestService):
        self.player_service = player_service
        self.quest_service = quest_service

    async def run(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        player_id: str = tool_input.get("playerId")
        npc_id: Optional[str] = tool_input.get("npcId")

        player_stats = self.player_service.get_state(player_id).model_dump(by_alias=True)
        npc_stats = (
            self.player_service.get_npc_state(player_id, npc_id).model_dump(by_alias=True)
            if npc_id
            else {}
        )

        quest_states = self.quest_service.get_all_states(player_id)
        return {
            "playerStats": player_stats,
            "npcStats": npc_stats,
            "questStates": quest_states,
        }
