"""
API 整合測試。
"""
import pytest
from unittest.mock import patch, AsyncMock


class TestGameAPI:
    """遊戲 API 測試。"""

    def test_list_scenes(self):
        """測試列出場景 API。"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/game/scenes")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_npcs(self):
        """測試列出 NPC API。"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/game/npcs")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_quests(self):
        """測試列出任務 API。"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/game/quests")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_player_state(self):
        """測試玩家狀態 API。"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/game/player/test_player/state")

        assert response.status_code == 200
        data = response.json()
        assert "playerStats" in data
        assert "npcStates" in data

    def test_player_quests(self):
        """測試玩家任務 API。"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/game/player/test_player/quests")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_travel(self):
        """測試旅行 API。"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        
        req = {
            "playerId": "test_player_travel",
            "destinationId": "classroom_5a"
        }
        
        response = client.post("/game/travel", json=req)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["currentSceneId"] == "classroom_5a"
        
        # 驗證狀態已更新
        state_res = client.get("/game/player/test_player_travel/state")
        assert state_res.json()["sceneId"] == "classroom_5a"


class TestConfigAPI:
    """設定 API 測試。"""

    def test_get_config(self):
        """測試取得設定 API。"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/config")

        assert response.status_code == 200
        data = response.json()
        assert "llmProvider" in data or "useMockLlm" in data


class TestHealthAPI:
    """健康檢查 API 測試。"""

    def test_health_check(self):
        """測試健康檢查 API。"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestDialogueAPI:
    """對話 API 測試。"""

    def test_dialogue_with_mock(self):
        """測試對話 API（使用 Mock LLM）。"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)

        request_data = {
            "playerId": "test_player",
            "npcId": "alex",
            "sceneId": "hallway_morning",
            "history": [
                {"speaker": "player", "text": "Hi Alex!"}
            ],
            "playerStats": {
                "confidence": 5,
                "empathy": 5,
                "stress": 5,
                "reputation": 5
            },
            "npcStats": {
                "friendship": 10,
                "trust": 8,
                "roleTags": ["friend"]
            },
            "locale": "en-US"
        }

        response = client.post("/ai/dialogue", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert "npcText" in data
        assert "suggestedPlayerChoices" in data
