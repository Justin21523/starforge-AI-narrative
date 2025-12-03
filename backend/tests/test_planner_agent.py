"""
PlannerAgent tests.
"""
import pytest
from unittest.mock import AsyncMock

from app.ai.orchestrator.planner import PlannerAgent
from app.ai.orchestrator.tooling import ToolRegistry
from app.ai.orchestrator.plan_types import PlanStep


class TestPlannerAgent:
    """PlannerAgent test class."""

    def test_default_plan(self, mock_llm_client, sample_dialogue_request):
        """Test default plan generation."""
        planner = PlannerAgent(
            llm_client=mock_llm_client,
            tool_registry=None,
            use_llm_planning=False,
        )

        import asyncio
        steps = asyncio.get_event_loop().run_until_complete(
            planner.plan_for_dialogue(sample_dialogue_request)
        )

        assert len(steps) >= 2
        assert steps[0].tool == "get_game_state"
        assert steps[1].tool == "search_lore"

    def test_default_plan_with_bully(self, mock_llm_client, bully_dialogue_request):
        """Test bullying scenario adds web_search."""
        planner = PlannerAgent(
            llm_client=mock_llm_client,
            tool_registry=None,
            use_llm_planning=False,
        )

        import asyncio
        steps = asyncio.get_event_loop().run_until_complete(
            planner.plan_for_dialogue(bully_dialogue_request)
        )

        # Should have web_search (because NPC has bully tag or stress > 7)
        tool_names = [s.tool for s in steps]
        assert "web_search" in tool_names

    @pytest.mark.asyncio
    async def test_llm_planning_fallback(self, sample_dialogue_request):
        """Test LLM planning fallback to default on failure."""
        # Mock LLM returns invalid format
        mock_llm = AsyncMock()
        mock_llm.complete = AsyncMock(return_value={"invalid": "response"})

        registry = ToolRegistry()

        planner = PlannerAgent(
            llm_client=mock_llm,
            tool_registry=registry,
            use_llm_planning=True,
        )

        steps = await planner.plan_for_dialogue(sample_dialogue_request)

        # Should fallback to default plan
        assert len(steps) >= 2
        assert steps[0].tool == "get_game_state"

    @pytest.mark.asyncio
    async def test_parse_llm_response_valid_json(self, sample_dialogue_request):
        """Test parsing valid LLM JSON response."""
        mock_llm = AsyncMock()

        registry = ToolRegistry()
        # Register mock tools
        from app.ai.orchestrator.tooling import FunctionTool
        registry.register(FunctionTool(
            "get_game_state",
            "Get game state",
            AsyncMock(return_value={})
        ))
        registry.register(FunctionTool(
            "search_lore",
            "Search lore",
            AsyncMock(return_value={})
        ))

        planner = PlannerAgent(
            llm_client=mock_llm,
            tool_registry=registry,
            use_llm_planning=False,
        )

        # Test parsing
        response = {
            "plan": [
                {"tool": "get_game_state", "input": {}, "rationale": "Get state"},
                {"tool": "search_lore", "input": {"terms": ["alex"]}, "rationale": "Get lore"},
            ]
        }

        steps = planner._parse_llm_response(response, sample_dialogue_request)

        assert len(steps) == 2
        assert steps[0].tool == "get_game_state"
        assert steps[1].tool == "search_lore"

    @pytest.mark.asyncio
    async def test_enrich_input(self, sample_dialogue_request):
        """Test input parameter enrichment."""
        mock_llm = AsyncMock()
        planner = PlannerAgent(llm_client=mock_llm, use_llm_planning=False)

        # Test get_game_state enrichment
        enriched = planner._enrich_input(
            "get_game_state",
            {},
            sample_dialogue_request
        )
        assert enriched["playerId"] == "test_player"
        assert enriched["npcId"] == "alex"

        # Test search_lore enrichment
        enriched = planner._enrich_input(
            "search_lore",
            {},
            sample_dialogue_request
        )
        assert "terms" in enriched
        assert len(enriched["terms"]) > 0
