import sys

from src.cache_config import install_cache

from .fully_automated_trader import FullyAutomatedTrader


def run_daily_routine(force_run: bool = False):
    """
    日次の自動取引ルーチンを実行します。

    Args:
        force_run (bool): 市場取引時間中でも強制的に実行するかどうか。
    """
    try:
        # キャッシュ設定
        install_cache()

        # 完全自動トレーダー実行
        trader = FullyAutomatedTrader()

        # daily_routine を呼び出し
        trader.daily_routine(force_run=force_run)

        return {"status": "success", "message": "日次ルーチンが正常に完了しました。"}

    except Exception as e:
        # エラーハンドリングをここに集約
        import traceback
        from datetime import datetime

        # 詳細なエラーログ
        error_details = {
            "timestamp": datetime.now().isoformat(),
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc(),
            "function": "daily_routine",
        }

        # ログファイルに記録
        try:
            import json

            with open("error_logs.json", "a", encoding="utf-8") as f:
                f.write(json.dumps(error_details, ensure_ascii=False) + "\n")
        except Exception:
            pass  # ログ記録失敗は無視

        # 簡潔なエラーメッセージを返す
        return {"status": "error", "message": f"{type(e).__name__}: {str(e)}"}


if __name__ == "__main__":
    # コマンドラインから実行された場合の処理
    force_run_arg = "--force" in sys.argv
    result = run_daily_routine(force_run=force_run_arg)

    if result["status"] == "error":
        print(f"エラーが発生しました: {result['message']}")
        sys.exit(1)
    else:
        print(result["message"])
