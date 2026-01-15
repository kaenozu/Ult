"""
System Setup Utilities
Centralized setup logic for all scripts to ensure consistent environments.
"""

import os
import sys
from pathlib import Path
from src.utils.logger import setup_logger

def setup_runtime_environment(name: str = "Script"):
    """
    Sets up the PYTHONPATH and logger for a script.
    
    Args:
        name: Name of the script for the logger.
    """
    # 1. Ensure project root is in sys.path
    project_root = Path(__file__).parent.parent.parent.absolute()
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    
    # 2. Setup standard logger
    logger = setup_logger(name)
    
    # 3. Change working directory to project root
    os.chdir(project_root)
    
    return logger
