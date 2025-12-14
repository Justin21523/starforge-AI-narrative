"""
遊戲資料路由：提供場景、NPC、任務與玩家狀態查詢，全部為本地/記憶體資料，無 GPU 依賴。
"""
import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends
from app.api import deps
from app.game.schemas import DialogueRequest, DialogueResponse, QuestUpdate, TravelRequest, TravelResponse
from app.game.services.player_service import PlayerService
from app.ai.rag.vector_store import VectorStore
from app.ai.tools.search_lore import SearchLoreTool

router = APIRouter()


def _read_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/travel")
async def travel(
    req: TravelRequest, player_service=Depends(deps.get_player_service)
) -> TravelResponse:
    """玩家移動到新場景。"""
    # 這裡可以加入驗證邏輯：是否可從當前場景移動到目標場景？
    # 暫時允許任意移動 (Debug/Teleport mode)
    await player_service.set_current_scene_async(req.player_id, req.destination_id)
    
    # 讀取目標場景資料
    data_dir = deps.get_data_dir()
    scenes = _read_json(data_dir / "scenes" / "base_scenes.json")
    target_scene = next((s for s in scenes if s["id"] == req.destination_id), None)
    
    return TravelResponse(
        success=True,
        currentSceneId=req.destination_id,
        sceneData=target_scene
    )


@router.get("/scenes")
def list_scenes():
    data_dir = deps.get_data_dir()
    return _read_json(data_dir / "scenes" / "base_scenes.json")


@router.get("/npcs")
def list_npcs():
    data_dir = deps.get_data_dir()
    return _read_json(data_dir / "npcs" / "base_npcs.json")


@router.get("/quests")
def list_quests():
    data_dir = deps.get_data_dir()
    return _read_json(data_dir / "quests" / "base_quests.json")


@router.get("/player/{player_id}/state")
def player_state(player_id: str, player_service=Depends(deps.get_player_service)):
    player = player_service.get_state(player_id)
    npc_states = {
        npc_id: npc_state.model_dump(by_alias=True)
        for npc_id, npc_state in player_service.npc_states.get(player_id, {}).items()
    }
    return {
        "playerStats": player.model_dump(by_alias=True),
        "npcStates": npc_states,
        "sceneId": player_service.get_current_scene(player_id),
    }


@router.get("/lore/search")
async def lore_search(q: str):
    """搜尋傳說/背景資料。"""
    # 使用與 DialogueAgent 相同的 in-memory VectorStore (new instance each call for simplicity)
    store = VectorStore()
    store.add("base-lore", "School encourages seeking help from teachers when bullied.", ["safety", "school"])
    store.add("base-friendship", "Building friendship requires empathy and honest communication.", ["friendship"])
    tool = SearchLoreTool(store)
    result = await tool.run({"terms": [q]})
    return result


@router.get("/player/{player_id}/quests")
def player_quests(player_id: str, quest_service=Depends(deps.get_quest_service)):
    return quest_service.get_all_states(player_id)


@router.patch("/player/{player_id}/quests")
def update_player_quests(
    player_id: str,
    updates: List[QuestUpdate],
    quest_service=Depends(deps.get_quest_service),
):
    quest_service.apply_updates(player_id, updates)
    return {"status": "ok", "quests": quest_service.get_all_states(player_id)}
