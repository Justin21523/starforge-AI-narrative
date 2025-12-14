from typing import List, Dict, Any

class MemoryAgent:
    """
    Manages conversation history and long-term memory.
    Compresses history if it exceeds a certain length.
    """
    
    def __init__(self, max_history_lines: int = 6):
        self.max_history_lines = max_history_lines

    def summarize_history(self, history: List[Any]) -> str:
        """
        Compresses dialogue history into a prompt-friendly string.
        If history is too long, summarizes older parts (Mock implementation for now).
        """
        if not history:
            return ""

        # For MVP, we just take the last N lines.
        # Future: Use LLM to summarize lines 0 to -N.
        recent = history[-self.max_history_lines:]
        
        # Format
        snippets = []
        for h in recent:
            # Handle both Pydantic model and dict
            speaker = getattr(h, "speaker", None) or h.get("speaker")
            text = getattr(h, "text", None) or h.get("text")
            snippets.append(f"{speaker}: {text}")
            
        summary = "\n".join(snippets)
        
        if len(history) > self.max_history_lines:
            summary = f"[...Previous conversation summarized: {len(history) - self.max_history_lines} lines hidden...]\n" + summary
            
        return summary
