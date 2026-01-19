"""
Automation UI Module
Streamlit UI for automation settings and controls.
"""

from datetime import datetime

import streamlit as st

from src.anomaly_detector import AnomalyDetector
from src.auto_rebalancer import AutoRebalancer
from src.pdf_report_generator import PDFReportGenerator


def render_automation_tab():
    st.header("🤖 完全自動化設定")
    st.write("Zero-Touch Trading: システムを完全自動化します。")

    # Tabs for different automation features
    tab1, tab2, tab3 = st.tabs(["🔄 自動リバランス", "🚨 異常検知", "📄 自動レポート"])

    # --- Tab 1: Auto Rebalancing ---
    with tab1:
        st.subheader("自動リバランス")
        st.write("ポートフォリオの相関が高くなったら自動的に銘柄を入れ替えます。")

        col1, col2 = st.columns(2)

        with col1:
            correlation_threshold = st.slider(
                "相関閾値",
                min_value=0.5,
                max_value=0.9,
                value=0.7,
                step=0.05,
                help="この値を超える相関があるとリバランスを実行",
            )

        with col2:
            dry_run = st.checkbox("シミュレーションモード（実際には売買しない）", value=True)

        if st.button("🔍 リバランス必要性をチェック", type="primary"):
            with st.spinner("ポートフォリオを分析中..."):
                rebalancer = AutoRebalancer(correlation_threshold=correlation_threshold)
                needs_rebalance, high_corr_pairs = rebalancer.check_rebalance_needed()

                if needs_rebalance:
                    st.warning(f"⚠️ リバランスが必要です（{len(high_corr_pairs)}組の高相関ペア）")

                    for t1, t2, corr in high_corr_pairs:
                        st.write(f"- {t1} ↔ {t2}: 相関 {corr:.2f}")

                    if st.button("🔄 リバランスを実行"):
                        actions = rebalancer.execute_rebalance(dry_run=dry_run)

                        if actions:
                            st.success(
                                f"✅ {len(actions)}件のリバランスを{'シミュレート' if dry_run else '実行'}しました"
                            )
                            for action in actions:
                                st.json(action)
                        else:
                            st.info("実行するアクションがありませんでした。")
                else:
                    st.success("✅ リバランス不要です。ポートフォリオは良好に分散されています。")

    # --- Tab 2: Anomaly Detection ---
    with tab2:
        st.subheader("異常検知アラート")
        st.write("急激な資産減少やシステムエラーを検知して通知します。")

        if st.button("🔍 異常検知を実行", type="primary"):
            with st.spinner("システムをチェック中..."):
                detector = AnomalyDetector()
                anomalies = detector.run_all_checks()

                if anomalies:
                    st.error(f"🚨 {len(anomalies)}件の異常を検出しました")

                    for anomaly in anomalies:
                        severity_color = "🔴" if anomaly["severity"] == "CRITICAL" else "🟡"
                        st.warning(f"{severity_color} **{anomaly['type']}**: {anomaly['message']}")

                        if "positions" in anomaly:
                            for pos in anomaly["positions"]:
                                st.write(f"  - {pos['ticker']}: {pos['pnl_pct']:+.1%}")
                else:
                    st.success("✅ 異常は検出されませんでした。システムは正常です。")

        st.markdown("---")
        st.subheader("通知設定")

        enable_line = st.checkbox("LINE通知を有効化", value=False)
        enable_discord = st.checkbox("Discord通知を有効化", value=False)

        if enable_line or enable_discord:
            st.info("💡 通知を有効にするには `config.json` で設定してください。")

    # --- Tab 3: Auto Reports ---
    with tab3:
        st.subheader("自動パフォーマンスレポート")
        st.write("週次/月次でAI分析付きPDFレポートを自動生成します。")

        st.selectbox("レポート頻度", ["毎週日曜日", "毎月末", "手動のみ"])

        if st.button("📄 今すぐレポートを生成", type="primary"):
            with st.spinner("PDFレポートを生成中..."):
                try:
                    generator = PDFReportGenerator()
                    output_path = f"reports/weekly_report_{st.session_state.get('report_count', 0)}.pdf"

                    success = generator.generate_weekly_report(output_path)

                    if success:
                        st.success(f"✅ レポートを生成しました: {output_path}")

                        # Offer download
                        try:
                            with open(output_path, "rb") as f:
                                st.download_button(
                                    label="📥 PDFをダウンロード",
                                    data=f,
                                    file_name=f"AGStock_Report_{datetime.now().strftime('%Y%m%d')}.pdf",
                                    mime="application/pdf",
                                )
                        except BaseException:
                            st.info(f"ファイルは {output_path} に保存されました。")

                        st.session_state["report_count"] = st.session_state.get("report_count", 0) + 1
                    else:
                        st.error("❌ レポート生成に失敗しました。ログを確認してください。")
                except Exception as e:
                    st.error(f"エラー: {e}")

        st.markdown("---")
        st.info("📧 自動配信機能は今後実装予定です。")
