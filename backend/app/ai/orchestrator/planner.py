"""
多步規劃器：用 LLM 產出要呼叫的工具序列，再由 ToolRegistry 執行。
支援 LLM 動態決策，並在解析失敗時回退到預設序列。
"""
import json
import logging
from typing import List, TYPE_CHECKING

from app.ai.clients.llm_client import LlmClient
from app.ai.orchestrator.plan_types import PlanStep
from app.ai.prompts.planner_prompt import build_planner_prompt
from app.game.schemas import DialogueRequest

if TYPE_CHECKING:
    from app.ai.orchestrator.tooling import ToolRegistry

logger = logging.getLogger(__name__)


class PlannerAgent:
    """
    多步規劃代理，使用 LLM 動態決定工具序列。
    """

    def __init__(
        self,
        llm_client: LlmClient,
        tool_registry: "ToolRegistry | None" = None,
        use_llm_planning: bool = True,
    ):
        self.llm_client = llm_client
        self.tool_registry = tool_registry
        self.use_llm_planning = use_llm_planning

    async def plan_for_dialogue(self, req: DialogueRequest) -> List[PlanStep]:
        """
        根據對話請求規劃工具序列。

        若 use_llm_planning=True 且有 tool_registry，則使用 LLM 動態規劃；
        否則使用預設序列。

        Args:
            req: 對話請求

        Returns:
            工具步驟列表
        """
        if self.use_llm_planning and self.tool_registry:
            try:
                return await self._plan_with_llm(req)
            except Exception as e:
                logger.warning(f"LLM planning failed, falling back to default: {e}")
                return self._default_plan(req)
        else:
            return self._default_plan(req)

    async def _plan_with_llm(self, req: DialogueRequest) -> List[PlanStep]:
        """
        使用 LLM 進行動態規劃。

        Args:
            req: 對話請求

        Returns:
            工具步驟列表
        """
        # 建構 prompt
        tools_prompt = self.tool_registry.get_tools_prompt()
        prompt = build_planner_prompt(req, tools_prompt)

        # 呼叫 LLM
        response = await self.llm_client.complete(prompt)

        # 解析回應
        steps = self._parse_llm_response(response, req)

        if not steps:
            logger.warning("LLM returned empty plan, using default")
            return self._default_plan(req)

        return steps

    def _parse_llm_response(
        self,
        response: dict,
        req: DialogueRequest,
    ) -> List[PlanStep]:
        """
        解析 LLM 回應為 PlanStep 列表。

        Args:
            response: LLM 回應（可能是 dict 或包含 JSON 的結構）
            req: 對話請求（用於填充必要參數）

        Returns:
            工具步驟列表
        """
        steps = []

        # 嘗試從不同格式中提取計畫
        plan_data = None

        # 情況 1: 回應本身就是列表
        if isinstance(response, list):
            plan_data = response

        # 情況 2: 回應中有 "plan" 或 "steps" 鍵
        elif isinstance(response, dict):
            for key in ["plan", "steps", "tools", "tool_calls"]:
                if key in response and isinstance(response[key], list):
                    plan_data = response[key]
                    break

            # 情況 3: 回應中有文字需要解析
            if plan_data is None:
                for key in ["content", "text", "message"]:
                    if key in response and isinstance(response[key], str):
                        try:
                            # 嘗試找到 JSON 陣列
                            text = response[key]
                            start = text.find("[")
                            end = text.rfind("]") + 1
                            if start >= 0 and end > start:
                                plan_data = json.loads(text[start:end])
                                break
                        except json.JSONDecodeError:
                            continue

        if not plan_data:
            return []

        # 轉換為 PlanStep
        available_tools = self.tool_registry.list_tools() if self.tool_registry else []

        for item in plan_data:
            if not isinstance(item, dict):
                continue

            tool_name = item.get("tool", "")
            if not tool_name or (available_tools and tool_name not in available_tools):
                logger.warning(f"Skipping unknown or invalid tool: {tool_name}")
                continue

            # 補充必要參數
            tool_input = item.get("input", {})
            tool_input = self._enrich_input(tool_name, tool_input, req)

            steps.append(PlanStep(
                tool=tool_name,
                input=tool_input,
                rationale=item.get("rationale", ""),
            ))

        return steps

    def _enrich_input(
        self,
        tool_name: str,
        tool_input: dict,
        req: DialogueRequest,
    ) -> dict:
        """
        補充工具輸入中缺失的必要參數。

        Args:
            tool_name: 工具名稱
            tool_input: 原始輸入
            req: 對話請求

        Returns:
            補充後的輸入
        """
        enriched = dict(tool_input)

        if tool_name == "get_game_state":
            if "playerId" not in enriched:
                enriched["playerId"] = req.player_id
            if "npcId" not in enriched:
                enriched["npcId"] = req.npc_id

        elif tool_name == "search_lore":
            if "terms" not in enriched or not enriched["terms"]:
                enriched["terms"] = [req.npc_id, req.scene_id]

        elif tool_name == "web_search":
            if "terms" not in enriched or not enriched["terms"]:
                enriched["terms"] = ["safe advice", "bullying"]

        return enriched

    def _default_plan(self, req: DialogueRequest) -> List[PlanStep]:
        """
        預設的工具序列。

        Args:
            req: 對話請求

        Returns:
            預設工具步驟列表
        """
        steps: List[PlanStep] = [
            PlanStep(
                tool="get_game_state",
                input={
                    "playerId": req.player_id,
                    "npcId": req.npc_id,
                },
                rationale="Need latest stats before crafting dialogue.",
            ),
            PlanStep(
                tool="search_lore",
                input={"terms": [req.npc_id, req.scene_id, req.locale]},
                rationale="Retrieve persona and setting context.",
            ),
        ]

        # 若 NPC 有 bully 標籤或玩家壓力較高，加入 web search
        is_sensitive = (
            "bully" in (req.npc_stats.role_tags or [])
            or req.player_stats.stress > 7
        )
        if is_sensitive:
            steps.append(
                PlanStep(
                    tool="web_search",
                    input={"terms": ["safe advice", "bullying", "support"]},
                    rationale="Fetch up-to-date safe advice for sensitive topics.",
                )
            )

        return steps
