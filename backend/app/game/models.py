"""
SQLAlchemy ORM 模型定義。
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Integer, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PlayerModel(Base):
    """玩家資料模型。"""
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    confidence: Mapped[int] = mapped_column(Integer, default=5)
    empathy: Mapped[int] = mapped_column(Integer, default=5)
    stress: Mapped[int] = mapped_column(Integer, default=5)
    reputation: Mapped[int] = mapped_column(Integer, default=5)
    current_scene: Mapped[str] = mapped_column(String(64), default="school_gate")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # 關聯
    npc_states: Mapped[list["NpcStateModel"]] = relationship(
        "NpcStateModel", back_populates="player", cascade="all, delete-orphan"
    )
    quest_progress: Mapped[list["QuestProgressModel"]] = relationship(
        "QuestProgressModel", back_populates="player", cascade="all, delete-orphan"
    )


class NpcStateModel(Base):
    """NPC 與玩家關係狀態模型。"""
    __tablename__ = "npc_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("players.id", ondelete="CASCADE"), nullable=False
    )
    npc_id: Mapped[str] = mapped_column(String(64), nullable=False)
    friendship: Mapped[int] = mapped_column(Integer, default=0)
    trust: Mapped[int] = mapped_column(Integer, default=0)
    role_tags: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # 關聯
    player: Mapped["PlayerModel"] = relationship("PlayerModel", back_populates="npc_states")

    # 唯一約束
    __table_args__ = (
        # 每個玩家的每個 NPC 只有一筆記錄
        {"sqlite_autoincrement": True},
    )


class QuestProgressModel(Base):
    """任務進度模型。"""
    __tablename__ = "quest_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("players.id", ondelete="CASCADE"), nullable=False
    )
    quest_id: Mapped[str] = mapped_column(String(64), nullable=False)
    stage: Mapped[str] = mapped_column(String(64), default="not_started")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # 關聯
    player: Mapped["PlayerModel"] = relationship("PlayerModel", back_populates="quest_progress")
