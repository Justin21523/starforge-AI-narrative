"""
玩家與 NPC 狀態的資料庫存取層。
"""
from typing import Dict, List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.game.models import PlayerModel, NpcStateModel
from app.game.schemas import PlayerStats, NpcStats, InternalEffects


class PlayerRepository:
    """玩家資料存取層。"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create_player(self, player_id: str) -> PlayerModel:
        """取得或建立玩家。"""
        result = await self.session.execute(
            select(PlayerModel).where(PlayerModel.id == player_id)
        )
        player = result.scalar_one_or_none()

        if player is None:
            player = PlayerModel(
                id=player_id,
                confidence=5,
                empathy=5,
                stress=5,
                reputation=5,
            )
            self.session.add(player)
            await self.session.flush()

        return player

    async def get_player_stats(self, player_id: str) -> PlayerStats:
        """取得玩家屬性。"""
        player = await self.get_or_create_player(player_id)
        return PlayerStats(
            confidence=player.confidence,
            empathy=player.empathy,
            stress=player.stress,
            reputation=player.reputation,
        )

    async def get_npc_state(
        self,
        player_id: str,
        npc_id: str,
        default_stats: Optional[NpcStats] = None,
    ) -> NpcStats:
        """取得 NPC 狀態。"""
        result = await self.session.execute(
            select(NpcStateModel).where(
                and_(
                    NpcStateModel.player_id == player_id,
                    NpcStateModel.npc_id == npc_id,
                )
            )
        )
        npc_state = result.scalar_one_or_none()

        if npc_state is None:
            # 使用預設值或空白狀態
            if default_stats:
                return default_stats.model_copy()
            return NpcStats(friendship=0, trust=0, role_tags=[])

        return NpcStats(
            friendship=npc_state.friendship,
            trust=npc_state.trust,
            role_tags=npc_state.role_tags or [],
        )

    async def get_all_npc_states(
        self,
        player_id: str,
        base_npcs: Dict[str, NpcStats],
    ) -> Dict[str, NpcStats]:
        """取得玩家的所有 NPC 狀態。"""
        result = await self.session.execute(
            select(NpcStateModel).where(NpcStateModel.player_id == player_id)
        )
        db_states = {s.npc_id: s for s in result.scalars().all()}

        states = {}
        for npc_id, base_state in base_npcs.items():
            if npc_id in db_states:
                s = db_states[npc_id]
                states[npc_id] = NpcStats(
                    friendship=s.friendship,
                    trust=s.trust,
                    role_tags=s.role_tags or base_state.role_tags,
                )
            else:
                states[npc_id] = base_state.model_copy()

        return states

    async def get_current_scene(self, player_id: str) -> str:
        """取得玩家當前場景。"""
        player = await self.get_or_create_player(player_id)
        return player.current_scene or "school_gate"

    async def set_current_scene(self, player_id: str, scene_id: str) -> None:
        """設定玩家當前場景。"""
        player = await self.get_or_create_player(player_id)
        player.current_scene = scene_id

    async def apply_effects(
        self,
        player_id: str,
        npc_id: Optional[str],
        effects: Optional[InternalEffects],
        base_npc_stats: Optional[NpcStats] = None,
    ) -> None:
        """套用對話效果。"""
        if not effects:
            return

        player = await self.get_or_create_player(player_id)

        # 更新玩家屬性
        if effects.player_stats_delta:
            delta = effects.player_stats_delta
            if delta.confidence is not None:
                player.confidence += delta.confidence
            if delta.empathy is not None:
                player.empathy += delta.empathy
            if delta.stress is not None:
                player.stress += delta.stress
            if delta.reputation is not None:
                player.reputation += delta.reputation

        # 更新 NPC 狀態
        if npc_id and effects.npc_stats_delta:
            result = await self.session.execute(
                select(NpcStateModel).where(
                    and_(
                        NpcStateModel.player_id == player_id,
                        NpcStateModel.npc_id == npc_id,
                    )
                )
            )
            npc_state = result.scalar_one_or_none()

            if npc_state is None:
                # 建立新的 NPC 狀態
                initial_friendship = base_npc_stats.friendship if base_npc_stats else 0
                initial_trust = base_npc_stats.trust if base_npc_stats else 0
                role_tags = base_npc_stats.role_tags if base_npc_stats else []

                npc_state = NpcStateModel(
                    player_id=player_id,
                    npc_id=npc_id,
                    friendship=initial_friendship,
                    trust=initial_trust,
                    role_tags=role_tags,
                )
                self.session.add(npc_state)

            delta = effects.npc_stats_delta
            if delta.friendship is not None:
                npc_state.friendship += delta.friendship
            if delta.trust is not None:
                npc_state.trust += delta.trust

    async def delete_player(self, player_id: str) -> bool:
        """刪除玩家（包含所有關聯資料）。"""
        result = await self.session.execute(
            select(PlayerModel).where(PlayerModel.id == player_id)
        )
        player = result.scalar_one_or_none()
        if player:
            await self.session.delete(player)
            return True
        return False
