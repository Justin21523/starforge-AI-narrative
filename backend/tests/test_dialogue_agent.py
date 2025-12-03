import pytest
from app.ai.mocks.llm_client_mock import LlmClientMock
from app.ai.orchestrator.dialogue_agent import DialogueAgent
from app.ai.orchestrator.safety_agent import SafetyAgent
from app.game.schemas import DialogueRequest, PlayerStats, NpcStats
from app.game.services.player_service import PlayerService
from app.game.services.quest_service import QuestService
from pathlib import Path


@pytest.fixture
def services(tmp_path: Path):
    project_root = Path(__file__).resolve().parents[2]
    data_dir = project_root / "data"
    player_service = PlayerService(base_npcs_path=data_dir / "npcs" / "base_npcs.json")
    quest_service = QuestService(base_quests_path=data_dir / "quests" / "base_quests.json")
    return player_service, quest_service


@pytest.mark.asyncio
async def test_dialogue_agent_updates_state(services):
    player_service, quest_service = services
    agent = DialogueAgent(
        llm_client=LlmClientMock(),
        player_service=player_service,
        quest_service=quest_service,
        safety_agent=SafetyAgent(),
    )

    req = DialogueRequest(
        playerId="p1",
        npcId="alex",
        sceneId="school_gate",
        history=[],
        playerStats=PlayerStats(confidence=1, empathy=2, stress=3, reputation=4),
        npcStats=NpcStats(friendship=0, trust=0, roleTags=["friend"]),
        locale="en-US",
    )

    resp = await agent.handle(req)

    assert resp.npc_text.startswith("Mock")
    assert len(resp.suggested_player_choices) >= 1

    # effects 應寫回 player/npc
    player_state = player_service.get_state("p1")
    assert player_state.confidence >= 2
    npc_state = player_service.get_npc_state("p1", "alex")
    assert npc_state.friendship >= 1
