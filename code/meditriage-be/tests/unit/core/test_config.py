from app.core.config import Settings, get_settings

def test_settings_default_project_name():
    """Verify that the default PROJECT_NAME is 'Medi-Triage API'."""
    settings = Settings()
    assert settings.PROJECT_NAME == "Medi-Triage API"

def test_settings_default_api_prefix():
    """Verify that the default API_V1_STR is '/api/v1'."""
    settings = Settings()
    assert settings.API_V1_STR == "/api/v1"

def test_settings_default_algorithm():
    """Verify that the default JWT algorithm is 'HS256'."""
    settings = Settings()
    assert settings.ALGORITHM == "HS256"

def test_settings_default_token_expiry():
    """Verify that the default ACCESS_TOKEN_EXPIRE_MINUTES is 30."""
    settings = Settings()
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 30

def test_settings_singleton_via_lru_cache():
    """Verify that get_settings() returns the same instance (caching works)."""
    get_settings.cache_clear()
    settings_1 = get_settings()
    settings_2 = get_settings()
    assert settings_1 is settings_2
