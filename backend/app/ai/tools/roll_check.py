from typing import Any, Dict, Optional
import random

from app.game.services.player_service import PlayerService

class RollCheckTool:
    name = "roll_check"
    description = "Perform a skill or stat check. Inputs: stat (e.g. 'confidence', 'empathy'), dc (number), seed (optional number)."

    def __init__(self, player_service: PlayerService):
        self.player_service = player_service

    async def run(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        stat_name = tool_input.get("stat")
        dc = tool_input.get("dc", 10)
        player_id = tool_input.get("playerId")
        
        # Optional: Allow passing a specific value directly if not tied to a player ID
        value = tool_input.get("value")

        if not value and player_id and stat_name:
            # Look up stat from player service
            player_stats = self.player_service.get_state(player_id)
            # Try to find stat in player_stats model
            if hasattr(player_stats, stat_name):
                value = getattr(player_stats, stat_name)
            else:
                return {"error": f"Stat '{stat_name}' not found for player '{player_id}'"}
        
        if value is None:
             # Default fallback if no context
             value = 5 

        # Simple d20 roll
        roll = random.randint(1, 20)
        total = roll + int(value)
        success = total >= int(dc)

        return {
            "stat": stat_name,
            "value": value,
            "roll": roll,
            "total": total,
            "dc": dc,
            "success": success,
            "message": f"Rolled {roll} + {value} = {total} (DC {dc}). {'Success' if success else 'Failure'}."
        }
