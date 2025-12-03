"""
多步計畫與工具輸出的資料結構，支援 Agent 在推理時選擇與串接工具。
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ToolDescription(BaseModel):
    """工具描述，用於向 LLM 說明可用工具。"""

    name: str
    description: str
    input_schema: Dict[str, Any] = Field(default_factory=dict)

    def to_prompt_string(self) -> str:
        """轉換為 prompt 中的工具描述字串。"""
        schema_str = ", ".join(
            f"{k}: {v}" for k, v in self.input_schema.items()
        ) if self.input_schema else "no parameters"
        return f"- {self.name}: {self.description} (input: {{{schema_str}}})"


class PlanStep(BaseModel):
    """單一步驟，包含工具名稱與輸入。"""

    tool: str
    input: Dict[str, Any] = Field(default_factory=dict)
    rationale: Optional[str] = None


class PlanResult(BaseModel):
    """每步執行後的結果與錯誤紀錄。"""

    tool: str
    output: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


class OrchestrationTrace(BaseModel):
    """整個多步流程的追蹤資訊，方便除錯與測試。"""

    steps: List[PlanStep]
    results: List[PlanResult]
