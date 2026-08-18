import io
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File as FastAPIFile,
    HTTPException,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import File, Folder
from app.schemas import FileResponse
from app.storage import MINIO_BUCKET, minio_client


router = APIRouter(
    prefix="/api",
    tags=["NEXORA"],
)


# =========================================================
# FOLDERS
# =========================================================


@router.get("/folders")
def get_folders(
    db: Session = Depends(get_db),
):
    statement = (
        select(Folder)
        .order_by(Folder.created_at.asc())
    )

    folders = db.scalars(statement).all()

    return [
        {
            "id": folder.id,
            "name": folder.name,
            "parent_id": folder.parent_id,
            "created_at": folder.created_at,
        }
        for folder in folders
    ]


@router.post("/folders")
def create_folder(
    name: str,
    parent_id: int | None = None,
    db: Session = Depends(get_db),
):
    if not name.strip():
        raise HTTPException(
            status_code=400,
            detail="Folder name cannot be empty",
        )

    if parent_id is not None:
        parent = db.get(Folder, parent_id)

        if not parent:
            raise HTTPException(
                status_code=404,
                detail="Parent folder not found",
            )

    folder = Folder(
        name=name.strip(),
        parent_id=parent_id,
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    return {
        "id": folder.id,
        "name": folder.name,
        "parent_id": folder.parent_id,
        "created_at": folder.created_at,
    }


@router.patch("/folders/{folder_id}")
def rename_folder(
    folder_id: int,
    name: str,
    db: Session = Depends(get_db),
):
    folder = db.get(Folder, folder_id)

    if not folder:
        raise HTTPException(
            status_code=404,
            detail="Folder not found",
        )

    if not name.strip():
        raise HTTPException(
            status_code=400,
            detail="Folder name cannot be empty",
        )

    folder.name = name.strip()

    db.commit()
    db.refresh(folder)

    return {
        "id": folder.id,
        "name": folder.name,
        "parent_id": folder.parent_id,
        "created_at": folder.created_at,
    }


@router.delete("/folders/{folder_id}")
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
):
    folder = db.get(Folder, folder_id)

    if not folder:
        raise HTTPException(
            status_code=404,
            detail="Folder not found",
        )

    # Do not delete a folder containing active files.
    files = db.scalars(
        select(File)
        .where(File.folder_id == folder_id)
        .where(File.is_deleted == False)
    ).all()

    if files:
        raise HTTPException(
            status_code=400,
            detail=(
                "Folder is not empty. "
                "Delete or move its files first."
            ),
        )

    # Do not delete a folder containing subfolders.
    children = db.scalars(
        select(Folder)
        .where(Folder.parent_id == folder_id)
    ).all()

    if children:
        raise HTTPException(
            status_code=400,
            detail="Folder contains subfolders.",
        )

    db.delete(folder)
    db.commit()

    return {
        "message": "Folder deleted successfully",
        "folder_id": folder_id,
    }


# =========================================================
# FILES
# =========================================================


@router.get(
    "/files/",
    response_model=list[FileResponse],
)
def get_files(
    folder_id: int | None = None,
    db: Session = Depends(get_db),
):
    statement = (
        select(File)
        .where(File.is_deleted == False)
        .where(File.folder_id == folder_id)
        .order_by(File.created_at.desc())
    )

    return db.scalars(statement).all()


# =========================================================
# UPLOAD
# =========================================================


@router.post(
    "/files/upload",
    response_model=FileResponse,
)
async def upload_file(
    uploaded_file: UploadFile = FastAPIFile(...),
    folder_id: int | None = None,
    db: Session = Depends(get_db),
):
    # Validate destination folder.
    if folder_id is not None:
        folder = db.get(Folder, folder_id)

        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Folder not found",
            )

    file_id = uuid.uuid4().hex

    filename = (
        uploaded_file.filename
        or "unnamed-file"
    )

    storage_key = (
        f"uploads/{file_id}/{filename}"
    )

    file_data = await uploaded_file.read()

    file_size = len(file_data)

    content_type = (
        uploaded_file.content_type
        or "application/octet-stream"
    )

    # Store actual file in MinIO.
    minio_client.put_object(
        MINIO_BUCKET,
        storage_key,
        io.BytesIO(file_data),
        length=file_size,
        content_type=content_type,
    )

    # Store metadata in PostgreSQL.
    database_file = File(
        filename=filename,
        content_type=content_type,
        size=file_size,
        storage_key=storage_key,
        folder_id=folder_id,
    )

    db.add(database_file)
    db.commit()
    db.refresh(database_file)

    return database_file


# =========================================================
# DOWNLOAD
# =========================================================


@router.get(
    "/files/{file_id}/download",
)
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
):
    database_file = db.get(
        File,
        file_id,
    )

    if (
        not database_file
        or database_file.is_deleted
    ):
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    try:
        response = minio_client.get_object(
            MINIO_BUCKET,
            database_file.storage_key,
        )

        return StreamingResponse(
            response.stream(32 * 1024),
            media_type=database_file.content_type,
            headers={
                "Content-Disposition": (
                    f'attachment; '
                    f'filename="{database_file.filename}"'
                )
            },
        )

    except Exception:
        raise HTTPException(
            status_code=404,
            detail=(
                "File could not be retrieved "
                "from storage"
            ),
        )


# =========================================================
# MOVE FILE TO TRASH
# =========================================================


@router.delete(
    "/files/{file_id}",
)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
):
    database_file = db.get(
        File,
        file_id,
    )

    if (
        not database_file
        or database_file.is_deleted
    ):
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    # Soft delete.
    # The actual object remains in MinIO
    # so it can be restored.
    database_file.is_deleted = True

    db.commit()

    return {
        "message": "File moved to Trash",
        "file_id": file_id,
    }


# =========================================================
# TRASH
# =========================================================


@router.get("/trash")
def get_trash(
    db: Session = Depends(get_db),
):
    statement = (
        select(File)
        .where(File.is_deleted == True)
        .order_by(File.created_at.desc())
    )

    files = db.scalars(statement).all()

    return [
        {
            "id": file.id,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": file.size,
            "storage_key": file.storage_key,
            "folder_id": file.folder_id,
            "created_at": file.created_at,
            "is_deleted": file.is_deleted,
        }
        for file in files
    ]


# =========================================================
# RESTORE FILE
# =========================================================


@router.post(
    "/files/{file_id}/restore",
)
def restore_file(
    file_id: int,
    db: Session = Depends(get_db),
):
    database_file = db.get(
        File,
        file_id,
    )

    if (
        not database_file
        or not database_file.is_deleted
    ):
        raise HTTPException(
            status_code=404,
            detail="File not found in Trash",
        )

    # Restore file.
    database_file.is_deleted = False

    db.commit()
    db.refresh(database_file)

    return {
        "message": "File restored successfully",
        "file_id": file_id,
    }


# =========================================================
# PERMANENT DELETE
# =========================================================


@router.delete(
    "/files/{file_id}/permanent",
)
def permanently_delete_file(
    file_id: int,
    db: Session = Depends(get_db),
):
    database_file = db.get(
        File,
        file_id,
    )

    if (
        not database_file
        or not database_file.is_deleted
    ):
        raise HTTPException(
            status_code=404,
            detail="File not found in Trash",
        )

    # Delete actual object from MinIO.
    try:
        minio_client.remove_object(
            MINIO_BUCKET,
            database_file.storage_key,
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail=(
                "Could not remove file "
                "from storage"
            ),
        )

    # Delete metadata from PostgreSQL.
    db.delete(database_file)
    db.commit()

    return {
        "message": "File permanently deleted",
        "file_id": file_id,
    }


# =========================================================
# STORAGE
# =========================================================


@router.get("/storage")
def get_storage_usage(
    db: Session = Depends(get_db),
):
    files = db.scalars(
        select(File)
        .where(File.is_deleted == False)
    ).all()

    used_bytes = sum(
        file.size
        for file in files
    )

    total_bytes = (
        10 * 1024 * 1024 * 1024
    )

    percentage = (
        used_bytes / total_bytes
    ) * 100

    return {
        "used_bytes": used_bytes,
        "total_bytes": total_bytes,
        "percentage": round(
            percentage,
            2,
        ),
    }
