import multiprocessing
from typing import List, Callable, Any
import logging

logger = logging.getLogger(__name__)


class ParallelExecutor:
    """
    Handles true parallel execution using Multiprocessing to bypass GIL.
    Best for CPU-intensive tasks like signal generation on large datasets.
    """

    def __init__(self, max_workers: int = None):
        self.max_workers = max_workers or (multiprocessing.cpu_count() - 1)

    def run(self, func: Callable, items: List[Any]) -> List[Any]:
        """
        Executes func(item) for each item in parallel.
        """
        logger.info(f"🚀 Distributing {len(items)} tasks across {self.max_workers} processes...")

        with multiprocessing.Pool(processes=self.max_workers) as pool:
            results = pool.map(func, items)

        return results
