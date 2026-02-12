"""
FastAPI dependencies for authentication and role-based access control.
Provides dependency injection for extracting current user from JWT tokens and checking roles.
"""
from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.security import decode_access_token
from app.core.logging import get_logger
from app.services import auth_service
from app.db.session import get_db
from app.models.user import User, UserRole

logger = get_logger(__name__)

# HTTP Bearer token security scheme
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to extract and validate the current user from JWT token.
    
    Usage:
        @router.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user": current_user.full_name}
    
    Args:
        credentials: HTTP Authorization header with Bearer token
        db: Database session
        
    Returns:
        Current authenticated User object
        
    Raises:
        HTTPException: If token is invalid, expired, or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Extract token from credentials
        token = credentials.credentials
        
        # Decode JWT token
        payload = decode_access_token(token)
        user_id_str: str = payload.get("sub")
        
        if user_id_str is None:
            raise credentials_exception
        
        # Convert string to UUID
        user_id = UUID(user_id_str)
        
    except (JWTError, ValueError):
        raise credentials_exception
    
    # Fetch user from database
    user = auth_service.get_user_by_id(user_id, db)
    
    if user is None:
        raise credentials_exception
    
    # Check if user's auth is active
    if not user.auth.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


# ==================== Role-Based Access Control ====================

class RoleChecker:
    """
    Dependency class for role-based access control.
    Ensures only users with specified roles can access certain endpoints.
    
    Usage:
        allow_nurse = RoleChecker([UserRole.NURSE])
        
        @router.post("/triage/start")
        def start_triage(current_user: User = Depends(allow_nurse)):
            # Only nurses can access this endpoint
            pass
    """
    def __init__(self, allowed_roles: List['UserRole']):
        self.allowed_roles = allowed_roles
    
    def __call__(self, user: User = Depends(get_current_user)) -> User:
        """
        FastAPI dependency that checks if user has required role.
        
        Args:
            user: Current authenticated user
            
        Returns:
            User object if authorized
            
        Raises:
            HTTPException: 403 if user does not have required role
        """
        if user.role not in self.allowed_roles:
            role_names = [role.value for role in self.allowed_roles]
            logger.warning(
                f"Access denied: user_id={user.id}, user_role={user.role.value}, "
                f"required_roles={role_names}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {role_names}"
            )
        
        logger.debug(f"Role check passed: user_id={user.id}, role={user.role.value}")
        return user


# Predefined role checkers for common use cases
allow_nurse = RoleChecker([UserRole.NURSE])
allow_doctor = RoleChecker([UserRole.DOCTOR])
allow_admin = RoleChecker([UserRole.ADMIN])
allow_staff = RoleChecker([UserRole.NURSE, UserRole.DOCTOR])  # Nurses and Doctors
allow_all_authenticated = RoleChecker([UserRole.NURSE, UserRole.DOCTOR, UserRole.ADMIN])
