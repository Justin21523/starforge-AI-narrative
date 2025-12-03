"""
任務進度的資料庫存取層。
"""
from typing import Dict, List

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.game.models import QuestProgressModel
from app.game.schemas import QuestUpdate


class QuestRepository:
    """任務進度存取層。"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_quest_stage(self, player_id: str, quest_id: str) -> str:
        """取得任務進度。"""
        result = await self.session.execute(
            select(QuestProgressModel).where(
                and_(
                    QuestProgressModel.player_id == player_id,
                    QuestProgressModel.quest_id == quest_id,
                )
            )
        )
        progress = result.scalar_one_or_none()
        return progress.stage if progress else "not_started"

    async def get_all_quest_states(
        self,
        player_id: str,
        base_quest_ids: List[str],
    ) -> Dict[str, str]:
        """取得玩家所有任務進度。"""
        result = await self.session.execute(
            select(QuestProgressModel).where(QuestProgressModel.player_id == player_id)
        )
        db_progress = {p.quest_id: p.stage for p in result.scalars().all()}

        # 合併基礎任務（預設 not_started）
        states = {quest_id: "not_started" for quest_id in base_quest_ids}
        states.update(db_progress)
        return states

    async def apply_updates(self, player_id: str, updates: List[QuestUpdate]) -> None:
        """套用任務更新。"""
        for upd in updates:
            result = await self.session.execute(
                select(QuestProgressModel).where(
                    and_(
                        QuestProgressModel.player_id == player_id,
                        QuestProgressModel.quest_id == upd.quest_id,
                    )
                )
            )
            progress = result.scalar_one_or_none()

            if progress is None:
                progress = QuestProgressModel(
                    player_id=player_id,
                    quest_id=upd.quest_id,
                    stage=upd.new_stage,
                )
                self.session.add(progress)
            else:
                progress.stage = upd.new_stage

    async def delete_player_quests(self, player_id: str) -> int:
        """刪除玩家所有任務進度。"""
        result = await self.session.execute(
            select(QuestProgressModel).where(QuestProgressModel.player_id == player_id)
        )
        progress_list = result.scalars().all()
        count = len(progress_list)
        for p in progress_list:
            await self.session.delete(p)
        return count
