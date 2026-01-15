"""Optional fallback for pytest-cov CLI options.

This plugin lets the test suite run even when ``pytest-cov`` is not
installed by registering stub coverage CLI options. When ``pytest-cov``
is available, it defers entirely to the real plugin.
"""

from __future__ import annotations


def _pytest_cov_installed() -> bool:
    try:
        import pytest_cov  # type: ignore  # noqa: F401
    except ImportError:
        return False
    return True


def pytest_addoption(parser):
    """Register stub coverage options if pytest-cov is absent."""

    if _pytest_cov_installed():
        return

    group = parser.getgroup("cov (stub)")
    group.addoption(
        "--cov",
        action="append",
        default=[],
        dest="cov_source",
        help="(stub) coverage source when pytest-cov is unavailable",
    )
    group.addoption(
        "--cov-report",
        action="append",
        default=[],
        dest="cov_report",
        help="(stub) coverage reports when pytest-cov is unavailable",
    )
    group.addoption(
        "--cov-config",
        action="store",
        default=None,
        dest="cov_config",
        help="(stub) coverage configuration file when pytest-cov is unavailable",
    )
