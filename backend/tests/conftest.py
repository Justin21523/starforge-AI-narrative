"""
Pytest fixtures for Starforge AI Narrative backend tests.
"""
import sys
from pathlib import Path

import pytest

# Ensure app module can be imported
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ai.mocks.llm_client_mock import LlmClientMock
from app.ai.rag.vector_store import VectorStore
from app.ai.orchestrator.safety_agent import SafetyAgent
from app.ai.orchestrator.tooling import ToolRegistry
from app.game.services.player_service import PlayerService
from app.game.services.quest_service import QuestService
from app.game.services.scene_service import SceneService
from app.game.schemas import (
    DialogueRequest,
    DialogueHistoryEntry,
    PlayerStats,
    NpcStats,
    QuestContext,
)


# Data path
DATA_DIR = Path(__file__).parent.parent.parent / "data"


@pytest.fixture
def mock_llm_client():
    """Mock LLM client."""
    return LlmClientMock()


@pytest.fixture
def mock_vector_store():
    """Mock VectorStore (keyword matching)."""
    store = VectorStore()
    store.add("base-lore", "School encourages seeking help from teachers when bullied.", ["safety", "school"])
    store.add("base-friendship", "Building friendship requires empathy and honest communication.", ["friendship"])
    store.add("alex-persona", "Alex is a curious and supportive classmate who values honesty.", ["npc", "alex"])
    return store


@pytest.fixture
def safety_agent():
    """SafetyAgent instance."""
    return SafetyAgent()


@pytest.fixture
def tool_registry():
    """Empty ToolRegistry."""
    return ToolRegistry()


@pytest.fixture
def player_service():
    """PlayerService instance (in-memory mode)."""
    return PlayerService(base_npcs_path=DATA_DIR / "npcs" / "base_npcs.json")


@pytest.fixture
def quest_service():
    """QuestService instance (in-memory mode)."""
    return QuestService(base_quests_path=DATA_DIR / "quests" / "base_quests.json")


@pytest.fixture
def scene_service():
    """SceneService instance."""
    return SceneService(base_scenes_path=DATA_DIR / "scenes" / "base_scenes.json")


@pytest.fixture
def sample_dialogue_request():
    """Sample dialogue request."""
    return DialogueRequest(
        player_id="test_player",
        npc_id="alex",
        scene_id="hallway_morning",
        history=[
            DialogueHistoryEntry(speaker="player", text="Hi Alex!"),
            DialogueHistoryEntry(speaker="npc", text="Hey! How are you doing today?"),
        ],
        player_stats=PlayerStats(confidence=5, empathy=5, stress=5, reputation=5),
        npc_stats=NpcStats(friendship=10, trust=8, role_tags=["friend"]),
        current_quest_context=QuestContext(quest_id="main_intro_day1", stage="hallway_greeting"),
        locale="en-US",
    )


@pytest.fixture
def bully_dialogue_request():
    """Bullying-related dialogue request (triggers safety check)."""
    return DialogueRequest(
        player_id="test_player",
        npc_id="bryce",
        scene_id="hallway_afternoon",
        history=[
            DialogueHistoryEntry(speaker="player", text="Stop bullying me!"),
            DialogueHistoryEntry(speaker="npc", text="What are you going to do about it?"),
        ],
        player_stats=PlayerStats(confidence=3, empathy=5, stress=8, reputation=5),
        npc_stats=NpcStats(friendship=-5, trust=2, role_tags=["bully"]),
        current_quest_context=None,
        locale="en-US",
    )
