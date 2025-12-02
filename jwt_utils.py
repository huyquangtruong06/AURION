import jwt
import uuid
from datetime import datetime, timedelta
from jwt_config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE, REFRESH_TOKEN_EXPIRE

def create_access_token(user_id: str) -> tuple[str, str]:
    """
    Tạo JWT access token
    Returns: (token, jti) - token và JWT ID để tracking
    """
    jti = str(uuid.uuid4())  # JWT ID
    payload = {
        "sub": user_id,
        "type": "access",
        "jti": jti,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + ACCESS_TOKEN_EXPIRE
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, jti


def create_refresh_token(user_id: str) -> str:
    """Tạo JWT refresh token"""
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + REFRESH_TOKEN_EXPIRE
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def verify_access_token(token: str) -> dict:
    """Verify access token và trả về payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def verify_refresh_token(token: str) -> dict:
    """Verify refresh token và trả về payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None