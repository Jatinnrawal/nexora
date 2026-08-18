from datetime import datetime

from pydantic import BaseModel


class FileResponse(BaseModel):
    id: int
    filename: str
    content_type: str
    size: int
    storage_key: str
    is_deleted: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
