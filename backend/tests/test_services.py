from pathlib import Path
import asyncio
from app.ai.orchestrator.safety_agent import SafetyAgent
from app.game.services.player_service import PlayerService
from app.game.services.quest_service import QuestService
from app.ai.tools.search_lore import SearchLoreTool
from app.ai.rag.vector_store import VectorStore
from app.game.schemas import InternalEffects, PlayerStatsDelta, NpcStatsDelta, QuestUpdate


def test_player_service_applies_effects():
    data_dir = Path(__file__).resolve().parents[2] / "data"
    player_service = PlayerService(base_npcs_path=data_dir / "npcs" / "base_npcs.json")
    effects = InternalEffects(
        playerStatsDelta=PlayerStatsDelta(confidence=2, empathy=-1),
        npcStatsDelta=NpcStatsDelta(friendship=3),
    )
    player_service.apply_effects("p1", "alex", effects)
    p = player_service.get_state("p1")
    n = player_service.get_npc_state("p1", "alex")
    assert p.confidence == 7  # 5 base + 2
    assert p.empathy == 4     # 5 base - 1
    assert n.friendship == 13  # base 10 + 3


def test_quest_service_updates():
    data_dir = Path(__file__).resolve().parents[2] / "data"
    quest_service = QuestService(base_quests_path=data_dir / "quests" / "base_quests.json")
    quest_service.apply_updates("p1", [])
    # set one quest
    quest_service.apply_updates("p1", [QuestUpdate(questId="main_intro_day1", newStage="hallway_greeting")])
    assert quest_service.get_quest_stage("p1", "main_intro_day1") == "hallway_greeting"


def test_safety_agent_overrides_on_risk():
    agent = SafetyAgent()
    flagged = agent.precheck(["I want to fight the bully"])
    raw = {
        "npcText": "Sure, let's fight back.",
        "suggestedPlayerChoices": ["Yes", "No"],
        "internalEffects": {},
    }
    safe = agent.filter_dialogue(raw, flagged)
    assert "trusted adult" in safe["npcText"]


def test_search_lore_tool_with_vector_store():
    store = VectorStore()
    store.add("doc1", "Teachers can help with bullying situations.", ["safety"])
    tool = SearchLoreTool(store)
    result = asyncio.get_event_loop().run_until_complete(tool.run({"terms": ["bullying"]}))
    assert result["hits"], "Expected at least one hit"
