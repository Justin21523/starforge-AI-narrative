from typing import List, Optional
from app.game.schemas import DialogueResponse

class SafetyAgent:
    """
    Safety Agent (Mock Implementation).
    Filters input/output for sensitive content (bullying, violence, self-harm).
    """
    
    def __init__(self):
        self.banned_words = ["kill", "die", "murder", "suicide", "hate", "idiot", "stupid"]
        
    def check_input(self, text: str) -> Optional[str]:
        """
        Check user input. Returns None if safe, or a refusal message if unsafe.
        """
        text_lower = text.lower()
        for word in self.banned_words:
            if word in text_lower:
                return "I'm not comfortable talking about that. Let's keep it positive."
        return None

    def check_output(self, response: DialogueResponse) -> DialogueResponse:
        """
        Check AI output. Sanitizes or replaces if unsafe.
        """
        text_lower = response.npc_text.lower()
        for word in self.banned_words:
            if word in text_lower:
                response.npc_text = "[Filtered by Safety Protocol] I... I don't think we should say that."
                return response
        return response

# Singleton instance for mock usage
safety_agent = SafetyAgent()