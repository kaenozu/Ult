import logging
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


class ModelOptimizer:
    """
    Utility for optimizing and quantizing ML models for edge/production inference.
    Supports ONNX quantization and potentially TensorRT/OpenVINO exports.
    """

    def __init__(self, models_dir: Path):
        self.models_dir = models_dir
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def quantize_onnx_model(self, model_path: str) -> Optional[str]:
        """
        Quantizes an ONNX model to INT8 to reduce size and improve CPU inference speed.
        Requires `onnxruntime` and `onnx` to be installed.
        """
        try:
            from onnxruntime.quantization import quantize_dynamic, QuantType

            p = Path(model_path)
            if not p.exists():
                logger.error(f"Model path {model_path} does not exist.")
                return None

            output_path = p.with_name(f"{p.stem}_quantized.onnx")

            logger.info(f"⚡ Quantizing ONNX model: {p.name} -> {output_path.name}")

            quantize_dynamic(model_input=str(p), model_output=str(output_path), weight_type=QuantType.QUInt8)

            logger.info("✅ Quantization complete.")
            return str(output_path)
        except ImportError:
            logger.warning("onnxruntime or onnx not installed. Skipping quantization.")
            return None
        except Exception as e:
            logger.error(f"Error during quantization: {e}")
            return None

    def optimize_for_cpu(self, model: Any, name: str) -> Any:
        """
        Placeholder for framework-specific CPU optimizations (e.g. torch.jit.optimize_for_inference).
        """
        logger.info(f"Optimizing {name} for CPU inference...")
        return model
