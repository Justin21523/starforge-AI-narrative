"""
SceneService tests.
"""
import pytest


class TestSceneService:
    """SceneService test class."""

    def test_get_scene_exists(self, scene_service):
        """Test getting an existing scene."""
        scene = scene_service.get_scene("school_gate")
        assert scene is not None
        assert scene["id"] == "school_gate"
        assert "name" in scene

    def test_get_scene_not_exists(self, scene_service):
        """Test getting a non-existent scene returns None."""
        scene = scene_service.get_scene("nonexistent_scene")
        assert scene is None

    def test_list_all_scenes(self, scene_service):
        """Test listing all scenes."""
        scenes = scene_service.list_all()
        assert isinstance(scenes, list)
        assert len(scenes) > 0
        assert all("id" in s for s in scenes)

    def test_get_connections(self, scene_service):
        """Test getting scene connections."""
        connections = scene_service.get_connections("school_gate")
        assert isinstance(connections, list)

    def test_scene_has_required_fields(self, scene_service):
        """Test scene contains required fields."""
        scenes = scene_service.list_all()
        required_fields = ["id", "name"]

        for scene in scenes:
            for field in required_fields:
                assert field in scene, f"Scene {scene.get('id')} missing field: {field}"
