#!/usr/bin/env python3
"""
Approval Workflow System - Demo Script
承認ワークフローシステムのデモスクリプト
"""

import asyncio
from datetime import datetime

from src.approval_system import (
    ApprovalSystem,
    ApprovalType,
    ApprovalContext,
    get_approval_system,
)


def demo_trade_approval():
    """取引承認のデモ"""
    print("=" * 60)
    print("承認ワークフローシステム - デモ")
    print("=" * 60)
    print()

    # システムを取得
    system = get_approval_system()

    # 承認リクエストを作成
    context = ApprovalContext(
        ticker="7203.T",
        action="BUY",
        quantity=100,
        price=2850.0,
        strategy="momentum",
        confidence=0.85,
        risk_level="MEDIUM",
        reason="強いモーメンタムシグナル（85%の信頼度）",
        metadata={"estimated_value": 285000, "signal_strength": "strong"},
    )

    # コールバックを定義（承認時に実行）
    def execute_trade_callback(request):
        print(f"\n{'=' * 60}")
        print(f"✅ 承認されました！取引を実行します...")
        print(f"{'=' * 60}")
        print(f"ティッカー: {request.context.ticker}")
        print(f"アクション: {request.context.action}")
        print(f"数量: {request.context.quantity}")
        print(f"価格: ¥{request.context.price:,.0f}")
        print(f"推定金額: ¥{request.context.metadata.get('estimated_value', 0):,.0f}")
        print(f"承認者: {request.approved_by}")
        print(f"承認時刻: {request.approved_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'=' * 60}\n")

    # 承認リクエストを作成し通知を送信
    print("1. 承認リクエストを作成中...")
    approval_req = system.create_and_notify_approval(
        approval_type=ApprovalType.TRADE_EXECUTION,
        title="BUY 100 7203.T",
        description="モーメンタム戦略による取引実行リクエスト",
        context=context,
        callback=execute_trade_callback,
        platform="both",  # 両方のプラットフォームに通知
        expiry_minutes=30,
    )

    print(f"✓ 承認リクエストID: {approval_req.request_id}")
    print(f"✓ ステータス: {approval_req.status.value}")
    print(f"✓ 有効期限: {approval_req.expires_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"✓ 通知送信先: {approval_req.platform}")

    # アクティブな承認を表示
    print("\n2. アクティブな承認リクエスト:")
    active = system.workflow.get_active_requests()
    for req in active:
        print(f"  - {req.request_id}: {req.title} ({req.status.value})")

    # 承認をシミュレート（実際にはWeb UIやSlack/Discordボタンから行う）
    print("\n3. 承認をシミュレート...")
    user = "demo_user"
    success = system.workflow.approve(
        request_id=approval_req.request_id,
        approved_by=user,
        platform="web",
    )

    if success:
        print(f"✓ 承認されました: {approval_req.request_id}")

        # 履歴を表示
        print("\n4. 承認履歴:")
        history = system.workflow.get_history(limit=10)
        for req in history[-5:]:  # 最新5件
            status_emoji = {
                "approved": "✅",
                "rejected": "❌",
                "expired": "⏰",
                "cancelled": "🚫",
            }.get(req.status.value, "⏳")

            print(
                f"  {status_emoji} {req.created_at.strftime('%Y-%m-%d %H:%M:%S')} - "
                f"{req.title} ({req.status.value})"
            )

    print("\n" + "=" * 60)
    print("デモ完了！")
    print("=" * 60)


def demo_multiple_approval_types():
    """複数の承認タイプのデモ"""
    print("\n\n" + "=" * 60)
    print("複数の承認タイプ - デモ")
    print("=" * 60)
    print()

    system = get_approval_system()

    # 戦略変更の承認
    strategy_context = ApprovalContext(
        reason="市場ボラティリティの上昇に対応",
        metadata={"current_strategy": "momentum", "new_strategy": "defensive"},
    )

    system.create_and_notify_approval(
        approval_type=ApprovalType.STRATEGY_CHANGE,
        title="戦略変更リクエスト",
        description="momentum戦略からdefensive戦略への切り替え",
        context=strategy_context,
        platform="slack",
        expiry_minutes=15,
    )
    print("✓ 戦略変更承認リクエストを作成")

    # リミット変更の承認
    risk_context = ApprovalContext(
        reason="ポートフォリオの拡大に対応",
        metadata={
            "current_limit": 1000000,
            "new_limit": 1500000,
            "percentage_increase": 50,
        },
    )

    system.create_and_notify_approval(
        approval_type=ApprovalType.RISK_LIMIT_CHANGE,
        title="リミット引き上げリクエスト",
        description="取引上限を100万から150万に引き上げ",
        context=risk_context,
        platform="discord",
        expiry_minutes=60,
    )
    print("✓ リミット変更承認リクエストを作成")

    # アクティブな承認を一覧表示
    print("\n現在のアクティブな承認:")
    active = system.workflow.get_active_requests()
    for i, req in enumerate(active, 1):
        print(f"  {i}. {req.title}")
        print(f"     タイプ: {req.type.value}")
        print(f"     有効期限: {req.expires_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"     ステータス: {req.status.value}")

    print("\n" + "=" * 60)


def demo_rejection_flow():
    """却下フローのデモ"""
    print("\n\n" + "=" * 60)
    print("却下フロー - デモ")
    print("=" * 60)
    print()

    system = get_approval_system()

    # 高リスクの取引リクエストを作成
    context = ApprovalContext(
        ticker="9999.T",
        action="BUY",
        quantity=1000,
        price=5000.0,
        confidence=0.45,
        risk_level="HIGH",
        reason="不明瞭なシグナル、確認が必要",
    )

    req = system.create_and_notify_approval(
        approval_type=ApprovalType.TRADE_EXECUTION,
        title="BUY 1000 9999.T (High Risk)",
        description="高リスク取引実行リクエスト",
        context=context,
        platform="both",
        expiry_minutes=10,
    )

    print(f"✓ 高リスク承認リクエストを作成: {req.request_id}")
    print(f"  信頼度: {context.confidence:.1%} (低い)")
    print(f"  リスクレベル: {context.risk_level}")

    # 却下をシミュレート
    print("\n却下をシミュレート...")
    success = system.workflow.reject(
        request_id=req.request_id,
        rejected_by="risk_manager",
        reason="信頼度が低すぎます（45%）。最小75%が必要。",
        platform="web",
    )

    if success:
        print(f"✓ 承認が却下されました")

        # 履歴を確認
        history = system.workflow.get_history()
        rejected_req = next(
            (r for r in history if r.request_id == req.request_id), None
        )

        if rejected_req:
            print(f"\n却下詳細:")
            print(f"  却下者: {rejected_req.rejected_by}")
            print(
                f"  却下時刻: {rejected_req.rejected_at.strftime('%Y-%m-%d %H:%M:%S')}"
            )
            print(f"  却下理由: {rejected_req.rejection_reason}")

    print("\n" + "=" * 60)


def demo_expiry_handling():
    """期限切れ処理のデモ"""
    print("\n\n" + "=" * 60)
    print("期限切れ処理 - デモ")
    print("=" * 60)
    print()

    system = get_approval_system()

    # 短い有効期限で承認リクエストを作成
    context = ApprovalContext(
        ticker="1234.T",
        action="BUY",
        quantity=50,
        price=1000.0,
    )

    # 手動で有効期限を1秒前に設定（デモ用）
    req = system.workflow.create_approval_request(
        approval_type=ApprovalType.TRADE_EXECUTION,
        title="BUY 50 1234.T",
        description="期限切れテスト",
        context=context,
        expiry_minutes=0,  # 即時期限切れ
    )

    # 手動で期限切れに設定（デモ用）
    req.expires_at = datetime.now()

    print(f"✓ 期限切れ承認リクエストを作成: {req.request_id}")
    print(f"  有効期限: {req.expires_at.strftime('%Y-%m-%d %H:%M:%S')} (過去)")

    # クリーンアップを実行
    print("\nクリーンアップを実行...")
    system.workflow.cleanup_expired()

    # アクティブな承認を確認
    active = system.workflow.get_active_requests()
    if not active:
        print("✓ 期限切れの承認リクエストがクリーンアップされました")
    else:
        print("✓ アクティブな承認リクエスト:", len(active))

    # 履歴を確認
    history = system.workflow.get_history()
    expired_req = next((r for r in history if r.request_id == req.request_id), None)

    if expired_req:
        print(f"\n履歴中のステータス: {expired_req.status.value}")

    print("\n" + "=" * 60)


def demo_web_integration():
    """Web統合のデモ（シミュレートされたAPI呼び出し）"""
    print("\n\n" + "=" * 60)
    print("Web API統合 - デモ（シミュレート）")
    print("=" * 60)
    print()

    print("サンプルAPIエンドポイント:")
    print()
    print("1. 承認リクエスト作成:")
    print("   POST /api/v1/approvals/trade")
    print("   {")
    print('     "ticker": "7203.T",')
    print('     "action": "BUY",')
    print('     "quantity": 100,')
    print('     "confidence": 0.85,')
    print('     "reason": "Strong momentum signal"')
    print("   }")

    print("\n2. アクティブな承認一覧取得:")
    print("   GET /api/v1/approvals?status=pending")

    print("\n3. 承認決定:")
    print("   POST /api/v1/approvals/decision")
    print("   {")
    print('     "request_id": "abc123xyz",')
    print('     "decision": "approve",')
    print('     "reason": "Approved based on strong indicators"')
    print("   }")

    print("\n4. 承認キャンセル:")
    print("   DELETE /api/v1/approvals/{request_id}")

    print("\n5. 期限切れクリーンアップ:")
    print("   POST /api/v1/approvals/cleanup")

    print("\n" + "=" * 60)


def main():
    """メイン関数"""
    print("\n\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 15 + "承認ワークフローシステム デモ" + " " * 18 + "║")
    print("╚" + "=" * 58 + "╝")
    print()
    print("このデモでは、承認ワークフローシステムの主要な機能を紹介します。")
    print("Slack/Discord統合、承認フロー、期限切れ処理などを含みます。")
    print()

    try:
        # 基本的な承認フロー
        demo_trade_approval()

        # 複数の承認タイプ
        demo_multiple_approval_types()

        # 却下フロー
        demo_rejection_flow()

        # 期限切れ処理
        demo_expiry_handling()

        # Web API統合
        demo_web_integration()

        print("\n\n")
        print("╔" + "=" * 58 + "╗")
        print("║" + " " * 20 + "すべてのデモ完了！" + " " * 20 + "║")
        print("╚" + "=" * 58 + "╝")
        print()

    except Exception as e:
        print(f"\n\nエラーが発生しました: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
