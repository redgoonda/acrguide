import os
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(
    title="ACRGuide",
    description="Radiology Guidelines Calculator",
    version="0.1.0",
    docs_url="/api/docs",
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
async def serve_spa():
    return FileResponse(STATIC_DIR / "index.html")


def cli():
    port = int(os.environ.get("PORT", 8300))
    uvicorn.run("acrguide.main:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    cli()
