"""
Repository 模組，提供資料庫存取層。
"""
from app.game.repositories.player_repository import PlayerRepository
from app.game.repositories.quest_repository import QuestRepository

__all__ = ["PlayerRepository", "QuestRepository"]
