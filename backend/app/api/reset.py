"""
重置玩家狀態的 stub（in-memory），方便前端開發時清空狀態。
"""
from fastapi import APIRouter
from app.api import deps

router = APIRouter()


@router.post("/reset/{player_id}")
def reset_player(player_id: str):
    # 重新載入依賴，重建服務實例
    deps.player_service.players.pop(player_id, None)
    deps.player_service.npc_states.pop(player_id, None)
    deps.player_service.current_scene.pop(player_id, None)
    deps.quest_service.player_quests.pop(player_id, None)
    return {"status": "reset", "playerId": player_id}
