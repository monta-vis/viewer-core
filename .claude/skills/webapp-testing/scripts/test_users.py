#!/usr/bin/env python3
"""
Test user credentials for Montavis Creator.

Usage:
    from test_users import DEFAULT_USER, USERS, get_user

    # Get default test user
    email, password = DEFAULT_USER

    # Get specific user
    user = get_user('sofia')
    print(user['email'], user['password'])
"""

# Test users from db_init.py
USERS = {
    "julian": {
        "email": "julian@montavis.tech",
        "password": "j",
        "role": "Admin",
        "name": "Julian"
    },
    "jonas": {
        "email": "jonas@montavis.tech",
        "password": "j",
        "role": "User",
        "name": "Jonas"
    },
    "toni": {
        "email": "toni@delonghi.de",
        "password": "t",
        "role": "CompanySuperUser",
        "name": "Toni"
    },
    "sofia": {
        "email": "sofia@delonghi.de",
        "password": "s",
        "role": "CompanySuperUser",
        "name": "Sofia Rossi"
    }
}

# Default user for tests
DEFAULT_USER = (USERS["sofia"]["email"], USERS["sofia"]["password"])


def get_user(name: str) -> dict:
    """Get user by name (case-insensitive)."""
    return USERS.get(name.lower())


def get_credentials(name: str = "sofia") -> tuple[str, str]:
    """Get (email, password) tuple for a user."""
    user = get_user(name)
    if user:
        return (user["email"], user["password"])
    return DEFAULT_USER


if __name__ == "__main__":
    print("Available test users:")
    print()
    for name, user in USERS.items():
        print(f"  {user['name']} ({user['role']})")
        print(f"    Email: {user['email']}")
        print(f"    Password: {user['password']}")
        print()
