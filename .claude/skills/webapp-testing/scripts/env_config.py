#!/usr/bin/env python3
"""
Environment configuration helper for Montavis testing.

Automatically detects Docker vs Host environment and provides correct URLs.

Usage:
    from env_config import get_urls, is_docker

    urls = get_urls()
    print(urls['frontend'])  # http://localhost:5210 (Docker) or http://localhost:5183 (Host)
    print(urls['backend'])   # http://host.docker.internal:5181 (Docker) or http://localhost:5181 (Host)
"""

import os
from pathlib import Path


def is_docker() -> bool:
    """
    Detect if running inside a Docker container.

    Checks multiple indicators:
    1. /.dockerenv file exists
    2. /proc/1/cgroup contains 'docker'
    3. DOCKER_CONTAINER env var is set
    """
    # Check for .dockerenv file
    if Path("/.dockerenv").exists():
        return True

    # Check cgroup for docker
    try:
        with open("/proc/1/cgroup", "r") as f:
            if "docker" in f.read():
                return True
    except (FileNotFoundError, PermissionError):
        pass

    # Check environment variable
    if os.environ.get("DOCKER_CONTAINER"):
        return True

    # Check if BACKEND_URL uses host.docker.internal (set by docker-compose)
    backend_url = os.environ.get("BACKEND_URL", "")
    if "host.docker.internal" in backend_url:
        return True

    return False


def get_urls() -> dict:
    """
    Get the correct frontend and backend URLs for the current environment.

    Priority:
    1. Environment variables (FRONTEND_URL, BACKEND_URL) - always trusted
    2. Default values based on detected environment

    Returns:
        dict with 'frontend' and 'backend' keys
    """
    # Default ports
    DEFAULT_FRONTEND_PORT_HOST = 5183
    DEFAULT_FRONTEND_PORT_DOCKER = 5210  # Typical Docker forwarded port
    DEFAULT_BACKEND_PORT = 5181

    in_docker = is_docker()

    # Frontend URL
    frontend_url = os.environ.get("FRONTEND_URL")
    if not frontend_url:
        port = DEFAULT_FRONTEND_PORT_DOCKER if in_docker else DEFAULT_FRONTEND_PORT_HOST
        frontend_url = f"http://localhost:{port}"

    # Backend URL
    backend_url = os.environ.get("BACKEND_URL")
    if not backend_url:
        if in_docker:
            backend_url = f"http://host.docker.internal:{DEFAULT_BACKEND_PORT}"
        else:
            backend_url = f"http://localhost:{DEFAULT_BACKEND_PORT}"

    return {
        "frontend": frontend_url,
        "backend": backend_url,
        "is_docker": in_docker
    }


def get_backend_url() -> str:
    """Shortcut to get backend URL."""
    return get_urls()["backend"]


def get_frontend_url() -> str:
    """Shortcut to get frontend URL."""
    return get_urls()["frontend"]


def print_env_info():
    """Print environment information for debugging."""
    urls = get_urls()
    print(f"Environment: {'Docker' if urls['is_docker'] else 'Host'}")
    print(f"Frontend URL: {urls['frontend']}")
    print(f"Backend URL: {urls['backend']}")
    print()
    print("Environment variables:")
    print(f"  FRONTEND_URL: {os.environ.get('FRONTEND_URL', '(not set)')}")
    print(f"  BACKEND_URL: {os.environ.get('BACKEND_URL', '(not set)')}")


if __name__ == "__main__":
    print_env_info()
