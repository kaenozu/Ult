import logging
import os
from pathlib import Path
from src.paths import MODELS_DIR

logger = logging.getLogger(__name__)

try:
    import onnxruntime as ort

    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logger.warning("onnxruntime not installed. ONNX optimization disabled.")


class ONNXModelOptimizer:
    """Utility to handle ONNX model inference and conversion infra."""

    def __init__(self, model_root: Path = MODELS_DIR):
        self.model_root = model_root
        self.session_cache = {}

    def get_session(self, model_name: str) -> Optional["ort.InferenceSession"]:
        """Get or create an ONNX inference session."""
        if not ONNX_AVAILABLE:
            return None

        if model_name in self.session_cache:
            return self.session_cache[model_name]

        model_path = self.model_root / f"{model_name}.onnx"
        if not model_path.exists():
            logger.debug(f"ONNX model not found: {model_path}")
            return None

        try:
            session = ort.InferenceSession(str(model_path))
            self.session_cache[model_name] = session
            return session
        except Exception as e:
            logger.error(f"Failed to load ONNX session for {model_name}: {e}")
            return None

    @staticmethod
    def is_optimized(model_name: str) -> bool:
        return (MODELS_DIR / f"{model_name}.onnx").exists()
