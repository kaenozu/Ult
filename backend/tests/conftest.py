import sys
import os
from pathlib import Path

# Get the absolute path of the backend directory
backend_path = Path(__file__).parent.parent.absolute()
src_path = backend_path / "src"

# Add both to sys.path
sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(src_path))
