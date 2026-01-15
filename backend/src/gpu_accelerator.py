"""
GPU Acceleration Check - GPU加速チェック
利用可能なGPUを検出し、最適なデバイスを選択
"""

import logging
import os
from typing import Dict

logger = logging.getLogger(__name__)


class GPUAccelerator:
    """GPU加速マネージャー"""

    def __init__(self):
        self.device = "cpu"
        self.gpu_available = False
        self.gpu_info = {}
        self._detect_gpu()

    def _detect_gpu(self):
        """利用可能なGPUを検出"""

        # 1. PyTorch CUDA チェック
        try:
            import torch

            if torch.cuda.is_available():
                self.gpu_available = True
                self.device = "cuda"
                self.gpu_info["pytorch"] = {
                    "available": True,
                    "device_count": torch.cuda.device_count(),
                    "device_name": torch.cuda.get_device_name(0) if torch.cuda.device_count() > 0 else "N/A",
                    "memory_total": (
                        torch.cuda.get_device_properties(0).total_memory if torch.cuda.device_count() > 0 else 0
                    ),
                }
                logger.info(f"CUDA GPU detected: {self.gpu_info['pytorch']['device_name']}")
            else:
                self.gpu_info["pytorch"] = {"available": False}
        except ImportError:
            self.gpu_info["pytorch"] = {
                "available": False,
                "reason": "PyTorch not installed",
            }
        except Exception as e:
            self.gpu_info["pytorch"] = {"available": False, "reason": str(e)}

        # 2. TensorFlow GPU チェック
        try:
            import tensorflow as tf

            gpus = tf.config.list_physical_devices("GPU")
            if gpus:
                self.gpu_available = True
                self.device = "cuda"
                self.gpu_info["tensorflow"] = {
                    "available": True,
                    "device_count": len(gpus),
                    "devices": [gpu.name for gpu in gpus],
                }
                logger.info(f"TensorFlow GPU detected: {len(gpus)} device(s)")
            else:
                self.gpu_info["tensorflow"] = {"available": False}
        except ImportError:
            self.gpu_info["tensorflow"] = {
                "available": False,
                "reason": "TensorFlow not installed",
            }
        except Exception as e:
            self.gpu_info["tensorflow"] = {"available": False, "reason": str(e)}

        # 3. LightGBM GPU チェック
        try:
            import lightgbm as lgb

            # LightGBMのGPUサポートは明示的にインストールが必要
            self.gpu_info["lightgbm"] = {
                "available": "gpu" in lgb.__file__.lower() or os.environ.get("LIGHTGBM_GPU", "0") == "1",
                "note": "GPU support requires special build",
            }
        except ImportError:
            self.gpu_info["lightgbm"] = {"available": False}
        except Exception as e:
            self.gpu_info["lightgbm"] = {"available": False, "reason": str(e)}

        if not self.gpu_available:
            logger.info("No GPU detected, using CPU")

    def get_device(self, framework: str = "pytorch") -> str:
        """最適なデバイスを取得"""
        if framework == "pytorch":
            try:
                import torch

                return "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                return "cpu"
        elif framework == "tensorflow":
            try:
                import tensorflow as tf

                return "/GPU:0" if tf.config.list_physical_devices("GPU") else "/CPU:0"
            except ImportError:
                return "/CPU:0"
        else:
            return "cpu"

    def optimize_memory(self):
        """GPUメモリを最適化"""
        try:
            import torch

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                logger.debug("PyTorch GPU memory cleared")
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")

        try:
            import tensorflow as tf

            tf.keras.backend.clear_session()
            logger.debug("TensorFlow session cleared")
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")

    def get_status(self) -> Dict:
        """GPU状態を取得"""
        status = {
            "gpu_available": self.gpu_available,
            "device": self.device,
            "frameworks": self.gpu_info,
        }

        # メモリ使用量を追加
        try:
            import torch

            if torch.cuda.is_available():
                status["memory"] = {
                    "allocated": torch.cuda.memory_allocated(0),
                    "cached": torch.cuda.memory_reserved(0),
                    "total": torch.cuda.get_device_properties(0).total_memory,
                }
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")

        return status

    def is_gpu_available(self) -> bool:
        """GPUが利用可能か"""
        return self.gpu_available


# シングルトン
_accelerator = None


def get_accelerator() -> GPUAccelerator:
    global _accelerator
    if _accelerator is None:
        _accelerator = GPUAccelerator()
    return _accelerator


def print_gpu_status():
    """GPU状態を表示"""
    acc = get_accelerator()
    status = acc.get_status()

    print("=" * 50)
    print("GPU Acceleration Status")
    print("=" * 50)
    print(f"GPU Available: {status['gpu_available']}")
    print(f"Device: {status['device']}")

    for framework, info in status.get("frameworks", {}).items():
        print(f"\n{framework}:")
        for k, v in info.items():
            print(f"  {k}: {v}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print_gpu_status()
