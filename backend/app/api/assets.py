from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.api import deps
from app.ai.assets.asset_service import AssetService

router = APIRouter()

class GenerateAssetRequest(BaseModel):
    prompt: str
    asset_type: str = Field("item", description="item, portrait, background")

class GenerateAssetResponse(BaseModel):
    asset_id: str = Field(..., alias="assetId")
    url: str

@router.post("/generate")
def generate_asset(
    req: GenerateAssetRequest,
    service: AssetService = Depends(deps.get_asset_service)
) -> GenerateAssetResponse:
    asset_id = service.generate_asset(req.prompt, req.asset_type)
    # Return a URL that points to the serve endpoint
    return GenerateAssetResponse(
        assetId=asset_id,
        url=f"/assets/{asset_id}.png"
    )

@router.get("/{filename}")
def serve_asset(
    filename: str,
    service: AssetService = Depends(deps.get_asset_service)
):
    # Expect filename like "uuid.png"
    asset_id = filename.split(".")[0]
    path = service.get_asset_path(asset_id)
    if not path:
        raise HTTPException(status_code=404, detail="Asset not found")
    return FileResponse(path)
