"""
ダッシュボード機能の検証
"""

from src.prediction_dashboard import create_prediction_analysis_dashboard
import sys
from unittest.mock import MagicMock

# Streamlitをモック
st_mock = MagicMock()
st_mock.columns = lambda n: [MagicMock() for _ in range(n)]
st_mock.session_state = {}
sys.modules["streamlit"] = st_mock


def verify_dashboard():
    print("🔍 ダッシュボード機能の検証を開始します...")

    try:
        # 関数がエラーなく呼び出せるか確認
        create_prediction_analysis_dashboard()
        print("✅ create_prediction_analysis_dashboard() の呼び出し成功")

    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    verify_dashboard()
