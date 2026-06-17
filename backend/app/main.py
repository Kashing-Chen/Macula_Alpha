from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import conversations, profile_menu, stories, user

app = FastAPI(title="Macula Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin] if settings.cors_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


app.include_router(user.router, prefix="/api")
app.include_router(stories.router, prefix="/api")
app.include_router(profile_menu.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Not Found", "path": str(request.url.path)},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, Exception) and hasattr(exc, "status_code"):
        status_code = getattr(exc, "status_code", 500)
        return JSONResponse(status_code=status_code, content={"error": str(exc)})

    print(f"[error] {exc}")
    return JSONResponse(status_code=500, content={"error": "Internal Server Error"})
