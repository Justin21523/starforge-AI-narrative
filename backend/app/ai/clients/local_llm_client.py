"""
本地 LLM 客戶端樣板，預設使用開源模型（例如 DeepSeek/Qwen）透過 transformers pipeline。
正式部署時請在設定檔指定模型路徑，並確保無需外部 API。
"""
from typing import Any, Dict
import asyncio
import json

from transformers import pipeline  # type: ignore


class LocalLlmClient:
    def __init__(self, model_path: str):
        # 使用 text-generation pipeline；可依需要改為 vllm/llama.cpp 等推理方式。
        self.generator = pipeline(
            "text-generation",
            model=model_path,
            torch_dtype="auto",
            device_map="auto",
        )

    def _generate_sync(self, prompt: str) -> str:
        """同步生成文字，供 asyncio.to_thread 呼叫。"""
        outputs = self.generator(prompt, max_new_tokens=256, do_sample=False)
        return outputs[0]["generated_text"]

    async def complete(self, prompt: str) -> Dict[str, Any]:
        """非同步完成對話生成，透過 to_thread 避免阻塞事件迴圈。"""
        # 使用 asyncio.to_thread 將同步推理包裝為非同步
        text = await asyncio.to_thread(self._generate_sync, prompt)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # 若模型未給出 JSON，回傳安全預設
            return {
                "npcText": text[:200],
                "suggestedPlayerChoices": ["Okay.", "Can we talk later?"],
                "internalEffects": {
                    "playerStatsDelta": {},
                    "npcStatsDelta": {},
                    "questUpdates": [],
                },
            }
