import time
import jwt
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import get_settings

settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/ai/") or request.url.path.startswith("/api/auth/"):
            user_id = "anonymous"
            if hasattr(request.state, "user") and request.state.user:
                user_id = str(request.state.user.id)
            elif "authorization" in request.headers:
                try:
                    token = request.headers["authorization"].replace("Bearer ", "")
                    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
                    user_id = payload.get("sub", "anonymous")
                except Exception:
                    user_id = "anonymous"

            now = time.time()
            day_ago = now - 86400
            prefix = "auth" if request.url.path.startswith("/api/auth/") else "ai"
            key = f"{user_id}:{prefix}"
            self.requests[key] = [t for t in self.requests[key] if t > day_ago]

            if prefix == "auth":
                limit = 20
            else:
                limit = settings.AI_CALLS_PER_DAY_REGISTERED if user_id != "anonymous" else settings.AI_CALLS_PER_DAY_FREE

            if len(self.requests[key]) >= limit:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")

            self.requests[key].append(now)

        return await call_next(request)
