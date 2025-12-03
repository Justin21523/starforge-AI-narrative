"""
AI 相關路由，前端只需呼叫此層，不直接碰 LLM 或 RAG。
"""
from fastapi import APIRouter, Depends

from app.ai.clients import get_llm_client
from app.ai.orchestrator.dialogue_agent import DialogueAgent
from app.ai.orchestrator.safety_agent import SafetyAgent
from app.api import deps
from app.core.config import get_settings, Settings
from app.game.schemas import DialogueRequest, DialogueResponse

router = APIRouter()


def get_dialogue_agent(settings: Settings = Depends(get_settings)) -> DialogueAgent:
    """
    建立 DialogueAgent 實例。

    根據 settings.llm_provider 選擇 LLM 客戶端：
    - openai: 使用 OpenAI API
    - local: 使用本地模型（需要 GPU）
    - mock: 使用 Mock 客戶端（開發/測試用）
    """
    llm_client = get_llm_client(settings)
    return DialogueAgent(
        llm_client=llm_client,
        player_service=deps.get_player_service(),
        quest_service=deps.get_quest_service(),
        safety_agent=SafetyAgent(),
    )


@router.post("/dialogue", response_model=DialogueResponse)
async def dialogue(
    req: DialogueRequest, agent: DialogueAgent = Depends(get_dialogue_agent)
) -> DialogueResponse:
    """
    處理對話請求。

    此端點整合 LLM、安全過濾、狀態更新等功能。
    """
    return await agent.handle(req)
