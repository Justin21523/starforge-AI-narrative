"""
工具註冊與執行框架，讓 Agent 可在推理過程呼叫不同工具（RAG、查詢、計算等）。
"""
from typing import Any, Dict, List, Protocol, Callable, Awaitable

from app.ai.orchestrator.plan_types import PlanStep, PlanResult, ToolDescription


class Tool(Protocol):
    name: str
    description: str

    async def run(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        ...


# 工具輸入 schema 定義
TOOL_INPUT_SCHEMAS: Dict[str, Dict[str, str]] = {
    "get_game_state": {
        "playerId": "string (required)",
        "npcId": "string (optional)",
    },
    "search_lore": {
        "terms": "array of strings",
    },
    "web_search": {
        "terms": "array of strings",
    },
}


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool:
        if name not in self._tools:
            raise KeyError(f"Tool not found: {name}")
        return self._tools[name]

    def list_tools(self) -> List[str]:
        """列出所有已註冊的工具名稱。"""
        return list(self._tools.keys())

    def get_tool_descriptions(self) -> List[ToolDescription]:
        """
        取得所有已註冊工具的描述，用於 LLM 規劃。

        Returns:
            工具描述列表
        """
        descriptions = []
        for name, tool in self._tools.items():
            descriptions.append(ToolDescription(
                name=name,
                description=tool.description,
                input_schema=TOOL_INPUT_SCHEMAS.get(name, {}),
            ))
        return descriptions

    def get_tools_prompt(self) -> str:
        """
        取得工具描述的 prompt 字串。

        Returns:
            格式化的工具列表字串
        """
        descriptions = self.get_tool_descriptions()
        return "\n".join(desc.to_prompt_string() for desc in descriptions)

    async def execute_plan(self, steps: list[PlanStep]) -> list[PlanResult]:
        results: list[PlanResult] = []
        for step in steps:
            try:
                tool = self.get(step.tool)
                output = await tool.run(step.input)
                results.append(PlanResult(tool=step.tool, output=output))
            except Exception as exc:  # noqa: BLE001
                results.append(PlanResult(tool=step.tool, output={}, error=str(exc)))
        return results


class FunctionTool:
    """
    簡化版工具包裝：接受一個 async function，方便快速建立 stub/mock。
    """

    def __init__(self, name: str, description: str, func: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]):
        self.name = name
        self.description = description
        self._func = func

    async def run(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        return await self._func(tool_input)
