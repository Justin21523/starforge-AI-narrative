"""
SafetyAgent：以規則與關鍵詞為主的輕量檢查，用於 mock/testing 階段。
不依賴 GPU 或外部模型，若偵測到高風險內容會覆寫回應為安全建議。
"""
from typing import Any, Dict, List

RISK_KEYWORDS = ["hurt", "fight", "revenge", "bully", "harm", "violence"]
SAFE_FALLBACK = {
    "npcText": "Let's stay safe and talk to a trusted adult or teacher about this.",
    "suggestedPlayerChoices": [
        "I'll talk to a teacher.",
        "Can you come with me to see the counselor?",
    ],
    "internalEffects": {
        "playerStatsDelta": {},
        "npcStatsDelta": {},
        "questUpdates": [],
    },
}


class SafetyAgent:
    def precheck(self, history_texts: List[str]) -> bool:
        """若歷史對話包含風險詞，回傳 True 以提示後續需慎處理。"""
        lowered = " ".join(history_texts).lower()
        return any(k in lowered for k in RISK_KEYWORDS)

    def filter_dialogue(self, raw_output: Dict[str, Any], flagged: bool) -> Dict[str, Any]:
        """若被標記或回應中含風險詞，覆寫為安全內容。"""
        npc_text = str(raw_output.get("npcText", ""))
        choices = raw_output.get("suggestedPlayerChoices", [])
        combined = f"{npc_text} {' '.join(choices)}".lower()
        if flagged or any(k in combined for k in RISK_KEYWORDS):
            return SAFE_FALLBACK
        return raw_output
