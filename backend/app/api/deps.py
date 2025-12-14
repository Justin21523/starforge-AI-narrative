"""
共用依賴：服務單例與資料路徑。使用記憶體/mock 實作，避免觸發 GPU 或外部資源。
"""
from pathlib import Path
from app.game.services.player_service import PlayerService
from app.game.services.quest_service import QuestService
from app.game.services.scene_service import SceneService
from app.game.services.save_service import SaveService
from app.ai.orchestrator.safety_agent import SafetyAgent, safety_agent
from app.ai.rag.vector_store import VectorStore, get_vector_store as create_vector_store

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = PROJECT_ROOT / "data"

player_service = PlayerService(base_npcs_path=DATA_DIR / "npcs" / "base_npcs.json")
quest_service = QuestService(base_quests_path=DATA_DIR / "quests" / "base_quests.json")
scene_service = SceneService(base_scenes_path=DATA_DIR / "scenes" / "base_scenes.json")
save_service = SaveService(save_dir=DATA_DIR / "saves")
# Shared in-memory vector store for RAG
vector_store = create_vector_store(use_mock=True)


def get_player_service() -> PlayerService:
    return player_service


def get_quest_service() -> QuestService:
    return quest_service


def get_scene_service() -> SceneService:
    return scene_service


def get_save_service() -> SaveService:
    return save_service


def get_safety_agent() -> SafetyAgent:
    return safety_agent


def get_vector_store_instance() -> VectorStore:
    return vector_store


def get_data_dir() -> Path:
    return DATA_DIR
