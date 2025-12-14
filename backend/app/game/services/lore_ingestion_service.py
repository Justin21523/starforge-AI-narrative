import json
import logging
from pathlib import Path
from typing import List, Dict, Any

from app.ai.rag.vector_store import VectorStore

logger = logging.getLogger(__name__)

class LoreIngestionService:
    """
    Service to ingest static game data (Lore, NPCs, Quests) into the VectorStore.
    """

    def __init__(self, vector_store: VectorStore, data_dir: Path):
        self.vector_store = vector_store
        self.data_dir = data_dir

    def ingest_all(self):
        """Ingest all supported data types."""
        logger.info("Starting RAG ingestion...")
        self._ingest_lore()
        self._ingest_npcs()
        self._ingest_quests()
        logger.info("RAG ingestion complete.")

    def _ingest_lore(self):
        """Ingest markdown files from data/lore."""
        lore_dir = self.data_dir / "lore"
        if not lore_dir.exists():
            return
            
        for md_file in lore_dir.glob("*.md"):
            try:
                text = md_file.read_text(encoding="utf-8")
                # Simple chunking by paragraph or double newline
                chunks = text.split("\n\n")
                for i, chunk in enumerate(chunks):
                    if not chunk.strip():
                        continue
                    doc_id = f"lore_{{md_file.stem}}_{i}"
                    # Use filename as tag
                    self.vector_store.add(doc_id, chunk.strip(), tags=["lore", md_file.stem])
            except Exception as e:
                logger.error(f"Failed to ingest lore {{md_file}}: {{e}}")

    def _ingest_npcs(self):
        """Ingest NPC profiles from data/npcs/base_npcs.json."""
        npc_file = self.data_dir / "npcs" / "base_npcs.json"
        if not npc_file.exists():
            return
            
        try:
            with npc_file.open("r", encoding="utf-8") as f:
                npcs = json.load(f)
                
            for npc in npcs:
                # Create a persona summary
                name = npc.get("name", "Unknown")
                role_tags = ", ".join(npc.get("roleTags", []))
                # Assuming simple structure, extend as needed
                text = f"NPC: {{name}}. Roles: {{role_tags}}."
                
                doc_id = f"npc_{{npc['id']}}"
                self.vector_store.add(doc_id, text, tags=["npc", npc["id"]])
        except Exception as e:
            logger.error(f"Failed to ingest NPCs: {{e}}")

    def _ingest_quests(self):
        """Ingest Quests from data/quests/base_quests.json."""
        quest_file = self.data_dir / "quests" / "base_quests.json"
        if not quest_file.exists():
            return

        try:
            with quest_file.open("r", encoding="utf-8") as f:
                quests = json.load(f)
                
            for quest in quests:
                title = quest.get("title", "Unknown")
                desc = quest.get("description", "")
                text = f"Quest: {{title}}. {{desc}}"
                
                doc_id = f"quest_{{quest['id']}}"
                self.vector_store.add(doc_id, text, tags=["quest", quest["id"]])
        except Exception as e:
            logger.error(f"Failed to ingest Quests: {{e}}")
