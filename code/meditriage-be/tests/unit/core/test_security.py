
from app.core.security import hash_password, verify_password,create_access_token, decode_access_token
from datetime import datetime, timedelta, timezone
import pytest
from jose import JWTError



def test_hash_password_returns_bcrypt_hash():
    # 1. Setup: Define a plain text password
    plain_password = "my_secure_password"
    
    # 2. Action: Hash the password using your application's function
    hashed_password = hash_password(plain_password)
    
    # 3. Assertions: Verify the expected outcomes
    # Check that it starts with the standard bcrypt prefix '$2b$'
    assert hashed_password.startswith("$2b$")
    
    # Check that the hashed password is not identical to the plain text password
    assert hashed_password != plain_password

def test_verify_password_correct():
    plain_password = "my_secure_password"
    hashed_password = hash_password(plain_password)

    is_valid = verify_password(plain_password, hashed_password)

    assert is_valid is True

def test_verify_password_incorrect():
    # 1. Setup: Hash a valid password
    valid_password = "my_secure_password"
    hashed_password = hash_password(valid_password)
    
    # 2. Action: Try to verify it using a WRONG password
    wrong_password = "this_is_wrong"
    is_valid = verify_password(wrong_password, hashed_password)
    
    # 3. Assertion: It should return False because the passwords don't match
    assert is_valid is False

def test_create_access_token_contains_sub():
    user_data = {"sub": "user_12345", "role":"NURSE"}

    token = create_access_token(user_data)
    decoded_payload = decode_access_token(token)

    assert "sub" in decoded_payload
    assert decoded_payload["sub"] == "user_12345"
    assert decoded_payload["role"] == "NURSE"

def test_create_access_token_contains_role():
    # 1. Setup: Define data with a specific role
    user_data = {"sub": "user_789", "role": "DOCTOR"}
    
    # 2. Action: Create and decode the token
    token = create_access_token(user_data)
    decoded_payload = decode_access_token(token)
    
    # 3. Assertion: Verify the 'role' key exists and matches the input exactly
    assert "role" in decoded_payload
    assert decoded_payload["role"] == "DOCTOR"

def test_create_access_token_has_expiry():
    # 1. Setup: Basic user data
    user_data = {"sub": "user_111"}
    
    # 2. Action: Create and decode the token
    token = create_access_token(user_data)
    decoded_payload = decode_access_token(token)
    
    # 3. Assertion: Verify the 'exp' (expiration) key was automatically added
    assert "exp" in decoded_payload

def test_create_access_token_custom_expiry():
    # 1. Setup: User data and a custom expiration time of 2 hours
    user_data = {"sub": "user_222"}
    custom_delta = timedelta(hours=2)
    
    # FIX: Use a "timezone-aware" timestamp so Python doesn't get confused by your local timezone
    now = datetime.now(timezone.utc)
    
    # 2. Action: Create token WITH the custom expiry, then decode it
    token = create_access_token(user_data, expires_delta=custom_delta)
    decoded_payload = decode_access_token(token)
    
    # 3. Assertion: Verify the expiration timestamp
    exp_timestamp = decoded_payload["exp"]
    expected_exp = (now + custom_delta).timestamp()
    
    # Now it will be perfectly accurate!
    assert abs(exp_timestamp - expected_exp) < 2

def test_decode_access_token_valid():
    # 1. Setup: Define some mock user data
    user_data = {"sub": "user_123", "role": "ADMIN"}
    
    # 2. Action: Create a real token, then decode it right back
    token = create_access_token(user_data)
    decoded_payload = decode_access_token(token)
    
    # 3. Assertion: Verify the decoded data perfectly matches the input data
    assert decoded_payload["sub"] == "user_123"
    assert decoded_payload["role"] == "ADMIN"
    assert "exp" in decoded_payload  # And ensure the expiration is still there

def test_decode_access_token_expired():
    # 1. Setup: Create a token that expired 1 minute ago
    user_data = {"sub": "user_late"}
    past_delta = timedelta(minutes=-1)
    
    # Create the expired token
    token = create_access_token(user_data, expires_delta=past_delta)
    
    # 2 & 3. Action and Assertion: Tell pytest we expect this next line to crash with a JWTError
    with pytest.raises(JWTError):
        decode_access_token(token)

def test_decode_access_token_invalid_signature():
    # 1. Setup: Create a perfectly valid token
    user_data = {"sub": "hacker"}
    valid_token = create_access_token(user_data)
    
    # Tamper with the token to simulate a forged signature
    tampered_token = valid_token + "bad"
    
    # 2 & 3. Action and Assertion: Tell pytest we expect this to crash with a JWTError
    with pytest.raises(JWTError):
        decode_access_token(tampered_token)
