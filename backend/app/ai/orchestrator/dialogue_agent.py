"""
簡化版對話 Agent：將請求組成提示後丟給 LLM 客戶端，並轉換為標準回應模型。
後續可在此插入 RAG、Safety、任務邏輯等流程。
"""
from typing import Any, Dict

from app.ai.clients.llm_client import LlmClient
from app.ai.orchestrator.plan_types import OrchestrationTrace
from app.ai.orchestrator.planner import PlannerAgent
from app.ai.orchestrator.tooling import ToolRegistry
from app.ai.orchestrator.safety_agent import SafetyAgent
from app.ai.orchestrator.memory_agent import MemoryAgent
from app.ai.tools.game_state import GetGameStateTool
from app.ai.tools.search_lore import SearchLoreTool
from app.ai.tools.web_search import WebSearchTool
from app.ai.tools.roll_check import RollCheckTool
from app.ai.rag.vector_store import VectorStore
from app.game.schemas import DialogueRequest, DialogueResponse
from app.game.services.player_service import PlayerService
from app.game.services.quest_service import QuestService


class DialogueAgent:
    """
    多步對話 Agent：先用 Planner 規劃要用的工具，執行後整合上下文再呼叫 LLM。
    目前工具序列固定；後續可改由 LLM 決策、插入 SafetyAgent、更多工具。
    """

    def __init__(
        self,
        llm_client: LlmClient,
        player_service: PlayerService,
        quest_service: QuestService,
        safety_agent: SafetyAgent | None = None,
        vector_store: VectorStore | None = None,
    ) -> None:
        self.llm_client = llm_client
        self.player_service = player_service
        self.quest_service = quest_service
        self.safety_agent = safety_agent or SafetyAgent()
        self.memory_agent = MemoryAgent()
        self.planner = PlannerAgent(llm_client)
        self.tools = ToolRegistry()
        
        # Use provided store or fallback (new empty store)
        store = vector_store or VectorStore()
        # Ensure default safety prompt exists
        store.add(
            "base-safety",
            "If bullying happens, seek help from teachers or trusted adults.",
            ["safety", "bullying"],
        )
        self.tools.register(GetGameStateTool(player_service, quest_service))
        self.tools.register(SearchLoreTool(store))
        self.tools.register(WebSearchTool())
        self.tools.register(RollCheckTool(player_service))

    async def handle(self, req: DialogueRequest) -> DialogueResponse:
        # 1. Safety Check (Input)
        # Check current user input (last entry if it's from player)
        if req.history and req.history[-1].speaker == "player":
            unsafe_msg = self.safety_agent.check_input(req.history[-1].text)
            if unsafe_msg:
                return DialogueResponse(
                    npcText=unsafe_msg,
                    suggestedPlayerChoices=["Sorry...", "I understand."],
                    internalEffects=None
                )

        # 2. Plan and Execute Tools
        # Pass Planner explicit tool registry so it knows about RollCheck
        self.planner.tool_registry = self.tools 
        plan_steps = await self.planner.plan_for_dialogue(req)
        plan_results = await self.tools.execute_plan(plan_steps)
        trace = OrchestrationTrace(steps=plan_steps, results=plan_results)

        # 3. Generate Response
        prompt = self._build_prompt(req, trace)
        raw_dict = await self.llm_client.complete(prompt) # Returns dict now based on Mock client
        
        # 4. Parse Response
        response = self._parse_response(raw_dict)

        # 5. Safety Check (Output)
        response = self.safety_agent.check_output(response)

        # 將效果寫回狀態（使用 mock / 記憶體實作，不觸發外部資源）
        self.player_service.apply_effects(
            player_id=req.player_id, npc_id=req.npc_id, effects=response.internal_effects
        )
        if response.internal_effects and response.internal_effects.quest_updates:
            self.quest_service.apply_updates(
                req.player_id, response.internal_effects.quest_updates
            )

        # 附帶 trace 供前端 dev 面板使用
        response.meta = {
            "trace": [r.model_dump() for r in trace.results],
            "prompt": prompt,
        }

        return response

    def _build_prompt(self, req: DialogueRequest, trace: OrchestrationTrace) -> str:
        """將遊戲上下文與工具結果組合成提示，保留 trace 方便 LLM 對齊推理。"""
        # Use MemoryAgent to summarize history
        history_summary = self.memory_agent.summarize_history(req.history)
        
        stats = (
            f"player stats: {req.player_stats.model_dump(by_alias=True)} | "
            f"npc stats: {req.npc_stats.model_dump(by_alias=True)}"
        )
        quest = (
            f"quest: {req.current_quest_context.quest_id} @ {req.current_quest_context.stage}"
            if req.current_quest_context
            else "quest: none"
        )
        tools_summary = "\n".join(
            f"- {res.tool}: {res.output if not res.error else 'error: ' + res.error}"
            for res in trace.results
        )
        return (
            f"[scene={req.scene_id}] [{quest}] [{stats}]\n"
            f"history:\n{history_summary}\n"
            f"tool results:\n{tools_summary}\n"
            "Respond as the NPC with safe, age-appropriate dialogue, cite safety if bullying, and include 2-3 choices."
        )

    def _parse_response(self, raw: Dict[str, Any]) -> DialogueResponse:
        """確保缺漏欄位有預設值，避免 LLM 回傳不完整資料。"""
        cleaned = {
            "npcText": raw.get("npcText", "…"),
            "suggestedPlayerChoices": raw.get("suggestedPlayerChoices", ["Okay."]),
            "internalEffects": raw.get(
                "internalEffects",
                {"playerStatsDelta": {}, "npcStatsDelta": {}, "questUpdates": []},
            ),
        }
        return DialogueResponse(**cleaned)
