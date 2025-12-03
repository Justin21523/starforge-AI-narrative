"""
Pydantic models for game and AI data exchange, using camelCase field names for frontend compatibility.
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


class BaseCamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class DialogueHistoryEntry(BaseCamelModel):
    speaker: Literal["player", "npc"]
    text: str


class PlayerStats(BaseCamelModel):
    confidence: int = 0
    empathy: int = 0
    stress: int = 0
    reputation: int = 0


class NpcStats(BaseCamelModel):
    friendship: int = 0
    trust: int = 0
    role_tags: List[str] = Field(default_factory=list, alias="roleTags")


class QuestContext(BaseCamelModel):
    quest_id: str = Field(..., alias="questId")
    stage: str


class PlayerStatsDelta(BaseCamelModel):
    confidence: Optional[int] = None
    empathy: Optional[int] = None
    stress: Optional[int] = None
    reputation: Optional[int] = None


class NpcStatsDelta(BaseCamelModel):
    friendship: Optional[int] = None
    trust: Optional[int] = None


class QuestUpdate(BaseCamelModel):
    quest_id: str = Field(..., alias="questId")
    new_stage: str = Field(..., alias="newStage")


class InternalEffects(BaseCamelModel):
    player_stats_delta: Optional[PlayerStatsDelta] = Field(
        None, alias="playerStatsDelta"
    )
    npc_stats_delta: Optional[NpcStatsDelta] = Field(None, alias="npcStatsDelta")
    quest_updates: Optional[List[QuestUpdate]] = Field(None, alias="questUpdates")


class DialogueRequest(BaseCamelModel):
    player_id: str = Field(..., alias="playerId")
    npc_id: str = Field(..., alias="npcId")
    scene_id: str = Field(..., alias="sceneId")
    history: List[DialogueHistoryEntry] = Field(default_factory=list)
    player_stats: PlayerStats = Field(..., alias="playerStats")
    npc_stats: NpcStats = Field(..., alias="npcStats")
    current_quest_context: Optional[QuestContext] = Field(
        None, alias="currentQuestContext"
    )
    locale: str = "en-US"


class DialogueResponse(BaseCamelModel):
    npc_text: str = Field(..., alias="npcText")
    suggested_player_choices: List[str] = Field(..., alias="suggestedPlayerChoices")
    internal_effects: Optional[InternalEffects] = Field(None, alias="internalEffects")
    meta: Optional[dict] = None
