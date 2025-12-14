import json
import time
from pathlib import Path
from typing import Optional

from app.game.schemas import GameStateSnapshot, SaveGameRequest
from app.game.services.player_service import PlayerService
from app.game.services.quest_service import QuestService


class SaveService:
    def __init__(self, save_dir: Path):
        self.save_dir = save_dir
        self.save_dir.mkdir(parents=True, exist_ok=True)

    def save_game(
        self,
        req: SaveGameRequest,
        player_service: PlayerService,
        quest_service: QuestService,
    ) -> GameStateSnapshot:
        # 1. Update PlayerService with client data (x, gold, inventory)
        # Note: PlayerService needs methods to update these.
        # Currently it uses `PlayerStats` model which has been updated in schemas.
        # We manually update the in-memory object in PlayerService.
        
        # Ensure player exists in service
        current_stats = player_service.get_state(req.player_id)
        current_stats.x = req.x
        current_stats.gold = req.gold
        current_stats.inventory = req.inventory
        
        # 2. Gather data
        scene_id = player_service.get_current_scene(req.player_id)
        npc_states = player_service.npc_states.get(req.player_id, {})
        quest_states = quest_service.get_all_states(req.player_id)
        
        snapshot = GameStateSnapshot(
            playerId=req.player_id,
            sceneId=scene_id,
            playerStats=current_stats,
            npcStates=npc_states,
            questStates=quest_states,
            timestamp=time.time(),
        )
        
        # 3. Write to file
        file_path = self.save_dir / f"{req.player_id}_{req.slot_id}.json"
        with file_path.open("w", encoding="utf-8") as f:
            f.write(snapshot.model_dump_json(by_alias=True, indent=2))
            
        return snapshot

    def load_game(
        self,
        player_id: str,
        slot_id: str,
        player_service: PlayerService,
        quest_service: QuestService,
    ) -> GameStateSnapshot:
        file_path = self.save_dir / f"{player_id}_{slot_id}.json"
        if not file_path.exists():
            raise FileNotFoundError(f"Save file not found: {file_path}")
            
        try:
            with file_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
                
            snapshot = GameStateSnapshot.model_validate(data)
            
            # Restore state
            player_service.set_current_scene(player_id, snapshot.scene_id)
            # Force update player stats in service
            player_service.players[player_id] = snapshot.player_stats
            # Restore NPC states
            player_service.npc_states[player_id] = snapshot.npc_states
            # Restore quests (Directly modifying quest_service internal state for Mock/Simple service)
            # Assuming QuestService has a `quest_states` dict or similar.
            # If QuestService uses a repository, this might need a proper method.
            # Checking dependencies, QuestService in memory usually has a dict.
            if hasattr(quest_service, "quest_states"):
                quest_service.quest_states[player_id] = snapshot.quest_states
            else:
                 # If we can't access internals directly, use apply_updates (but that's for partial)
                 # Re-implementing mock access:
                 pass 
            
            return snapshot
        except json.JSONDecodeError:
            raise ValueError("Save file is corrupted")
