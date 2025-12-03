"""
PlannerAgent 的 Prompt 模板。
"""
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.game.schemas import DialogueRequest


PLANNER_SYSTEM_PROMPT = """You are a planning agent for an educational narrative game about preventing bullying.
Your task is to decide which tools to use and in what order to gather information for generating NPC dialogue.

You must output a valid JSON array of tool calls. Each tool call should have:
- "tool": the tool name (string)
- "input": the input parameters (object)
- "rationale": why this tool is needed (string)

Available tools:
{tools_prompt}

Guidelines:
1. Always start with "get_game_state" to understand the current player/NPC state
2. Use "search_lore" when you need world-building context or NPC persona information
3. Use "web_search" sparingly, only when dealing with sensitive topics that need external safety guidance
4. Order tools logically - gather state first, then context, then external info if needed
5. Don't use more than 3-4 tools per request

Output format (JSON array only, no explanation):
[
  {{"tool": "tool_name", "input": {{"key": "value"}}, "rationale": "reason"}}
]"""


def build_planner_prompt(
    req: "DialogueRequest",
    tools_prompt: str,
) -> str:
    """
    建構 Planner 的完整 prompt。

    Args:
        req: 對話請求
        tools_prompt: 工具描述字串

    Returns:
        完整的 prompt
    """
    # 建構情境描述
    history_text = ""
    if req.history:
        history_text = "\n".join(
            f"  {h.speaker}: {h.text}" for h in req.history[-5:]  # 只取最後 5 則
        )

    quest_text = ""
    if req.current_quest_context:
        quest_text = f"Quest: {req.current_quest_context.quest_id} (stage: {req.current_quest_context.stage})"

    npc_role_tags = ", ".join(req.npc_stats.role_tags) if req.npc_stats.role_tags else "unknown"

    context = f"""Current situation:
- Player ID: {req.player_id}
- NPC ID: {req.npc_id} (roles: {npc_role_tags})
- Scene: {req.scene_id}
- Player stats: confidence={req.player_stats.confidence}, empathy={req.player_stats.empathy}, stress={req.player_stats.stress}
- NPC stats: friendship={req.npc_stats.friendship}, trust={req.npc_stats.trust}
- {quest_text}

Recent conversation:
{history_text if history_text else "  (no history)"}

Based on this context, decide which tools to call and in what order.
Output only the JSON array, no other text."""

    return PLANNER_SYSTEM_PROMPT.format(tools_prompt=tools_prompt) + "\n\n" + context
