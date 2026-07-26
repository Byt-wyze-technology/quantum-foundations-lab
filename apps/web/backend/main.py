"""FastAPI application and production static-file host.

Specification reference: §11 (API design), §13 (validation), §19 (security).

The app can run entirely in the browser; this backend exists for
reproducibility, validation and export. Every mathematical rejection reaches
the client in the single envelope §13 defines, because the core raises one
exception type and one handler translates it.
"""

import json
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from quantum_foundations import __version__
from quantum_foundations.core import QuantumValidationError

from .routers.api import router

#: §19 — a request larger than this cannot be a legitimate one- or two-qubit
#: payload, so it is refused before any parsing work is done.
MAX_REQUEST_BYTES = 64 * 1024

#: §19 — strict CORS. The development server and nothing else by default.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app = FastAPI(
    title="Quantum Foundations Lab API",
    version=__version__,
    description=(
        "A mathematical teaching model for ideal one- and two-qubit systems. "
        "Not a physical hardware simulator."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Refuse oversized bodies before they are parsed (§19)."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        declared = request.headers.get("content-length")
        if declared is not None and declared.isdigit() and int(declared) > MAX_REQUEST_BYTES:
            return JSONResponse(
                status_code=413,
                content={
                    "error": {
                        "code": "REQUEST_TOO_LARGE",
                        "message": f"Request bodies are limited to {MAX_REQUEST_BYTES} bytes.",
                        "details": {"limit_bytes": MAX_REQUEST_BYTES},
                    }
                },
            )
        return await call_next(request)


app.add_middleware(RequestSizeLimitMiddleware)
app.include_router(router)


@app.exception_handler(QuantumValidationError)
async def quantum_validation_handler(
    _request: Request, exception: QuantumValidationError
) -> JSONResponse:
    """Render a core rejection in the envelope of §13."""
    return JSONResponse(status_code=400, content={"error": exception.to_dict()})


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    _request: Request, exception: RequestValidationError
) -> JSONResponse:
    """Give schema failures the same envelope, so clients parse one shape."""
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "INVALID_REQUEST",
                "message": "The request body does not match the expected schema.",
                # Round-tripped through JSON so any exception objects Pydantic
                # attached become plain, serialisable values.
                "details": {"errors": json.loads(json.dumps(exception.errors(), default=str))},
            }
        },
    )


DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        """Serve the built frontend, falling back to index.html for routes."""
        candidate = (DIST / path).resolve()
        if candidate.is_file() and DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
