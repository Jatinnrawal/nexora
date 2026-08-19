from prometheus_fastapi_instrumentator import Instrumentator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes import router
from app.storage import ensure_bucket


Base.metadata.create_all(bind=engine)
ensure_bucket()


app = FastAPI(
    title="NEXORA API",
    description="Cloud storage backend for NEXORA",
    version="1.0.0",
)


Instrumentator().instrument(app).expose(app)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "nexora-api",
    }
