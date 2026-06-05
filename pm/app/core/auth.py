from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from .config import settings

bearer = HTTPBearer()


def _decode(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.DIRECTUS_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


class CurrentUser:
    def __init__(self, id: str, role: str):
        self.id = id
        self.role = role

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_agent(self) -> bool:
        return self.role in ("admin", "agent")

    def require_admin(self) -> "CurrentUser":
        if not self.is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
        return self

    def require_agent(self) -> "CurrentUser":
        if not self.is_agent:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Agents only")
        return self


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> CurrentUser:
    payload = _decode(creds.credentials)
    user_id = payload.get("id") or payload.get("sub")
    role = payload.get("role", "")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return CurrentUser(id=str(user_id), role=str(role))
