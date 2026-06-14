"""Smoke test: confirm the FastAPI app imports cleanly.

Run from the project root:  python tests/test_import.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))             # so `import backend...` resolves
sys.path.insert(0, str(ROOT / "backend"))  # so backend's internal imports resolve

try:
    from backend.main import app
    print("App imported successfully")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()
