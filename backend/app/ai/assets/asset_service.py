import uuid
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFont, ImageColor
import random

class AssetService:
    def __init__(self, assets_dir: Path):
        self.assets_dir = assets_dir
        self.generated_dir = self.assets_dir / "generated"
        self.generated_dir.mkdir(parents=True, exist_ok=True)

    def generate_asset(self, prompt: str, asset_type: str = "item") -> str:
        """
        生成資產圖片（Mock 實作：產生帶有文字的色塊圖）。
        回傳: asset_id
        """
        asset_id = str(uuid.uuid4())
        filename = f"{asset_id}.png"
        filepath = self.generated_dir / filename

        # 隨機背景色
        color_name = random.choice(list(ImageColor.colormap.keys()))
        img = Image.new("RGB", (256, 256), color=color_name)
        draw = ImageDraw.Draw(img)

        # 繪製文字 (簡單居中)
        text = f"{asset_type}\n{prompt[:20]}..."
        
        # 嘗試載入字型，失敗則用預設
        try:
            # Linux 常見路徑，若無則 fallback
            font = ImageFont.truetype("DejaVuSans.ttf", 24)
        except OSError:
            font = ImageFont.load_default()

        # 取得文字大小 (Pillow 10+ 使用 textbbox)
        try:
            _, _, w, h = draw.textbbox((0, 0), text, font=font)
            xy = ((256 - w) / 2, (256 - h) / 2)
            draw.text(xy, text, fill="white", font=font, align="center")
        except Exception:
            # Fallback for older Pillow or errors
            draw.text((10, 100), text, fill="white")

        img.save(filepath)
        return asset_id

    def get_asset_path(self, asset_id: str) -> Optional[Path]:
        """取得資產檔案路徑"""
        filename = f"{asset_id}.png"
        filepath = self.generated_dir / filename
        if filepath.exists():
            return filepath
        return None
