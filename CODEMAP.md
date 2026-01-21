# Project CodeMap

Generated on: Ult

```
├── backend
│   ├── data
│   │   ├── logs
│   │   │   ├── agstock.log
│   │   │   └── error.log
│   │   ├── parquet
│   │   │   ├── 4062.T.parquet
│   │   │   ├── 4502.T.parquet
│   │   │   ├── 6098.T.parquet
│   │   │   ├── 6471.T.parquet
│   │   │   ├── 6501.T.parquet
│   │   │   ├── 6758.T.parquet
│   │   │   ├── 6857.T.parquet
│   │   │   ├── 6861.T.parquet
│   │   │   ├── 6920.T.parquet
│   │   │   ├── 6954.T.parquet
│   │   │   ├── 7203.T.parquet
│   │   │   ├── 7267.T.parquet
│   │   │   ├── 7974.T.parquet
│   │   │   ├── 8035.T.parquet
│   │   │   ├── 8058.T.parquet
│   │   │   ├── 8306.T.parquet
│   │   │   ├── 9432.T.parquet
│   │   │   ├── 9983.T.parquet
│   │   │   ├── 9984.T.parquet
│   │   │   ├── CL=F.parquet
│   │   │   ├── GC=F.parquet
│   │   │   ├── GSPC.parquet
│   │   │   ├── JPY=X.parquet
│   │   │   ├── N225.parquet
│   │   │   ├── TNX.parquet
│   │   │   └── VIX.parquet
│   │   ├── screenshots
│   │   │   └── TEST_DIARY_7777.T_20260119_153010.png
│   │   ├── agstock.db
│   │   └── stock_data.db
│   ├── logs
│   │   ├── agstock.log
│   │   └── error.log
│   ├── models
│   │   └── checkpoints
│   ├── src
│   │   ├── agents
│   │   │   ├── __init__.py
│   │   │   ├── base_agent.py
│   │   │   ├── committee.py
│   │   │   ├── consensus_engine.py
│   │   │   ├── neuromancer.py
│   │   │   ├── news_agent.py
│   │   │   ├── risk_agent.py
│   │   │   ├── risk_manager.py
│   │   │   ├── rl_agent_wrapper.py
│   │   │   └── vision_agent.py
│   │   ├── ai
│   │   │   └── predictor.py
│   │   ├── analysis
│   │   │   ├── __init__.py
│   │   │   ├── monte_carlo.py
│   │   │   ├── multi_timeframe.py
│   │   │   ├── multimodal_analyzer.py
│   │   │   ├── pdf_reader.py
│   │   │   └── performance_analyzer.py
│   │   ├── analysis_temp
│   │   │   ├── analytics.py
│   │   │   ├── fundamental_analyzer.py
│   │   │   ├── llm_analyzer.py
│   │   │   ├── performance_analyzer.py
│   │   │   ├── portfolio_analyzer.py
│   │   │   ├── scenario_analyzer.py
│   │   │   └── sentiment_analyzer.py
│   │   ├── api
│   │   │   ├── routers
│   │   │   │   ├── __init__.py
│   │   │   │   ├── alerts.py
│   │   │   │   ├── approvals.py
│   │   │   │   ├── circuit_breaker.py
│   │   │   │   ├── journal.py
│   │   │   │   ├── learning.py
│   │   │   │   ├── market.py
│   │   │   │   ├── portfolio.py
│   │   │   │   ├── replay.py
│   │   │   │   ├── settings.py
│   │   │   │   ├── settings_temp_check.py
│   │   │   │   ├── shock_radar.py
│   │   │   │   ├── trading.py
│   │   │   │   ├── vision.py
│   │   │   │   └── websocket.py
│   │   │   ├── __init__.py
│   │   │   ├── dependencies.py
│   │   │   ├── responses.py
│   │   │   ├── schemas.py
│   │   │   ├── server.py
│   │   │   ├── vibe_endpoints.py
│   │   │   ├── websocket_broadcaster.py
│   │   │   ├── websocket_manager.py
│   │   │   └── websocket_types.py
│   │   ├── api_temp
│   │   │   └── api_server.py
│   │   ├── backtesting
│   │   │   ├── __init__.py
│   │   │   ├── analyzer.py
│   │   │   ├── backtester.py
│   │   │   ├── engine.py
│   │   │   ├── executor.py
│   │   │   └── fast_engine.py
│   │   ├── cli
│   │   │   ├── analyze_ticker.py
│   │   │   ├── autotrade.py
│   │   │   ├── backtest.py
│   │   │   ├── opencode.py
│   │   │   ├── optimize_strategy.py
│   │   │   ├── rebalance.py
│   │   │   └── sentiment.py
│   │   ├── core
│   │   │   ├── __init__.py
│   │   │   ├── agent_loop.py
│   │   │   ├── archive_manager.py
│   │   │   ├── config.py
│   │   │   ├── constants.py
│   │   │   ├── dynasty_manager.py
│   │   │   ├── evo_coder.py
│   │   │   ├── exceptions.py
│   │   │   ├── experience_manager.py
│   │   │   ├── knowledge_extractor.py
│   │   │   ├── legacy_reporter.py
│   │   │   ├── logger.py
│   │   │   ├── memory_annotator.py
│   │   │   ├── messenger.py
│   │   │   ├── quantum_ledger.py
│   │   │   ├── risk_manager.py
│   │   │   ├── schemas.py
│   │   │   ├── strategy_breeder.py
│   │   │   ├── strategy_validator.py
│   │   │   ├── trading_engine.py
│   │   │   ├── types.py
│   │   │   └── voice.py
│   │   ├── dashboard
│   │   │   ├── __init__.py
│   │   │   ├── morning_dashboard.py
│   │   │   ├── simple_dashboard.py
│   │   │   ├── unified_dashboard.py
│   │   │   └── verify_dashboard.py
│   │   ├── data
│   │   │   ├── __init__.py
│   │   │   ├── data_loader.py
│   │   │   ├── earnings_history.py
│   │   │   ├── earnings_provider.py
│   │   │   ├── feedback_store.py
│   │   │   ├── macro_loader.py
│   │   │   ├── sentiment_correlator.py
│   │   │   ├── universe_manager.py
│   │   │   ├── us_market_monitor.py
│   │   │   └── whale_tracker.py
│   │   ├── data_temp
│   │   │   ├── __init__.py
│   │   │   ├── data_loader.py
│   │   │   ├── data_manager.py
│   │   │   └── data_quality_guard.py
│   │   ├── db
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   ├── manager.py
│   │   │   └── models.py
│   │   ├── ensemble
│   │   │   ├── __init__.py
│   │   │   ├── adaptive_ensemble.py
│   │   │   ├── advanced_ensemble.py
│   │   │   ├── dynamic_ensemble.py
│   │   │   ├── enhanced_ensemble_predictor.py
│   │   │   ├── ensemble.py
│   │   │   ├── ensemble_predictor.py
│   │   │   ├── ensemble_weight_optimizer.py
│   │   │   ├── stacking.py
│   │   │   └── stacking_ensemble.py
│   │   ├── evolution
│   │   │   ├── briefing_generator.py
│   │   │   ├── chart_vision.py
│   │   │   ├── constellation_anchor.py
│   │   │   ├── contextual_bandit.py
│   │   │   ├── future_sight.py
│   │   │   ├── genetic_breeder.py
│   │   │   ├── genetic_optimizer.py
│   │   │   ├── heritage_manager.py
│   │   │   ├── market_simulator.py
│   │   │   ├── paradigm_switcher.py
│   │   │   ├── regime_classifier.py
│   │   │   ├── strategy_breeder.py
│   │   │   ├── strategy_generator.py
│   │   │   ├── swarm_intel.py
│   │   │   └── terminus_protocol.py
│   │   ├── execution
│   │   │   ├── __init__.py
│   │   │   ├── adaptive_rebalancer.py
│   │   │   ├── anomaly_detector.py
│   │   │   ├── event_trader.py
│   │   │   ├── execution_engine.py
│   │   │   ├── news_shock_defense.py
│   │   │   ├── position_sizer.py
│   │   │   └── precog_defense.py
│   │   ├── features
│   │   │   ├── __init__.py
│   │   │   ├── __init__new.py
│   │   │   ├── advanced_features.py
│   │   │   ├── comprehensive_features.py
│   │   │   ├── drip.py
│   │   │   ├── earnings_calendar.py
│   │   │   ├── enhanced_features.py
│   │   │   ├── feature_selector.py
│   │   │   ├── sector_rotation.py
│   │   │   ├── sentiment_indicators.py
│   │   │   ├── tax_optimizer.py
│   │   │   └── time_series_features.py
│   │   ├── improvements
│   │   │   ├── __init__.py
│   │   │   ├── memory_cache.py
│   │   │   ├── numba_utils.py
│   │   │   └── settings.py
│   │   ├── infra
│   │   │   ├── cache_config.py
│   │   │   ├── config.py
│   │   │   ├── config_manager.py
│   │   │   ├── log_config.py
│   │   │   ├── logger_config.py
│   │   │   └── logging_config.py
│   │   ├── ml
│   │   │   ├── base_predictor.py
│   │   │   ├── enhanced_ensemble_predictor.py
│   │   │   ├── ensemble_predictor.py
│   │   │   ├── future_predictor.py
│   │   │   ├── lgbm_predictor.py
│   │   │   ├── lstm_predictor.py
│   │   │   ├── prophet_predictor.py
│   │   │   └── transformer_predictor.py
│   │   ├── mobile
│   │   │   ├── __init__.py
│   │   │   └── commander.py
│   │   ├── monitoring
│   │   │   ├── __init__.py
│   │   │   ├── performance_analyzer.py
│   │   │   ├── prediction_monitor.py
│   │   │   └── resource_monitor.py
│   │   ├── optimization
│   │   │   ├── __init__.py
│   │   │   ├── evolution_engine.py
│   │   │   ├── genetic_breeder.py
│   │   │   ├── genetic_optimizer.py
│   │   │   ├── hyperparameter_tuner.py
│   │   │   ├── meta_optimizers.py
│   │   │   ├── multi_model_optimizer.py
│   │   │   ├── optuna_tuner.py
│   │   │   └── quantum_engine.py
│   │   ├── oracle
│   │   │   ├── __init__.py
│   │   │   └── oracle_2026.py
│   │   ├── performance
│   │   │   ├── __init__.py
│   │   │   ├── analyzer.py
│   │   │   ├── async_processor.py
│   │   │   ├── attribution.py
│   │   │   ├── metrics.py
│   │   │   └── monitor.py
│   │   ├── plugins
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   └── manager.py
│   │   ├── portfolio
│   │   │   ├── __init__.py
│   │   │   ├── correlation_engine.py
│   │   │   ├── legacy.py
│   │   │   └── risk_parity.py
│   │   ├── prompts
│   │   │   ├── __init__.py
│   │   │   ├── earnings_prompts.py
│   │   │   └── reporting_prompts.py
│   │   ├── rag
│   │   │   ├── __init__.py
│   │   │   ├── deep_hunter.py
│   │   │   ├── earnings_analyzer.py
│   │   │   ├── earnings_rag.py
│   │   │   ├── experience_memory.py
│   │   │   ├── filing_watcher.py
│   │   │   ├── multimodal_analyst.py
│   │   │   └── pdf_loader.py
│   │   ├── realtime
│   │   │   ├── __init__.py
│   │   │   ├── client.py
│   │   │   ├── README.md
│   │   │   ├── realtime_engine.py
│   │   │   ├── streamer.py
│   │   │   └── websocket_server.py
│   │   ├── reporting
│   │   │   ├── __init__.py
│   │   │   ├── sovereign_report.py
│   │   │   └── weekly_report_html.py
│   │   ├── reporting_temp
│   │   │   ├── pdf_report_generator.py
│   │   │   └── tax_report_generator.py
│   │   ├── rl
│   │   │   ├── __init__.py
│   │   │   ├── agent.py
│   │   │   ├── environment.py
│   │   │   └── trainer.py
│   │   ├── security
│   │   │   ├── circuit_breaker.py
│   │   │   ├── error_handling.py
│   │   │   ├── input_validator.py
│   │   │   ├── risk_manager.py
│   │   │   ├── secure_config.py
│   │   │   ├── secure_data_manager.py
│   │   │   └── zero_trust.py
│   │   ├── services
│   │   │   ├── __init__.py
│   │   │   ├── api_optimizer.py
│   │   │   ├── approval_service.py
│   │   │   ├── defense.py
│   │   │   ├── log_monitor.py
│   │   │   ├── model_health.py
│   │   │   ├── playbook_runner.py
│   │   │   ├── scenario.py
│   │   │   ├── trade_journal.py
│   │   │   └── trading_service.py
│   │   ├── simulation
│   │   │   ├── chronos_lab.py
│   │   │   ├── digital_twin.py
│   │   │   └── probability_engine.py
│   │   ├── sovereign
│   │   │   ├── notifier.py
│   │   │   └── scheduler.py
│   │   ├── strategies
│   │   │   ├── ensemble
│   │   │   │   ├── __init__.py
│   │   │   │   ├── combined.py
│   │   │   │   ├── ensemble.py
│   │   │   │   └── multi_timeframe.py
│   │   │   ├── fundamental
│   │   │   │   ├── __init__.py
│   │   │   │   └── dividend.py
│   │   │   ├── ml
│   │   │   │   ├── __init__.py
│   │   │   │   ├── attention_lstm.py
│   │   │   │   ├── gru.py
│   │   │   │   ├── lightgbm.py
│   │   │   │   ├── lstm.py
│   │   │   │   ├── random_forest.py
│   │   │   │   ├── reinforcement_learning.py
│   │   │   │   └── transformer.py
│   │   │   ├── sentiment
│   │   │   │   ├── __init__.py
│   │   │   │   └── sentiment.py
│   │   │   ├── technical
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py
│   │   │   │   ├── bollinger_bands.py
│   │   │   │   ├── rsi.py
│   │   │   │   └── sma_crossover.py
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── ensemble_strategy.py
│   │   │   ├── evolved_strategy.py
│   │   │   ├── hedging_manager.py
│   │   │   ├── hierarchical_strategy.py
│   │   │   ├── hybrid.py
│   │   │   ├── loader.py
│   │   │   ├── meta_registry.py
│   │   │   ├── moe_strategy.py
│   │   │   ├── options_strategy.py
│   │   │   ├── orchestrator.py
│   │   │   ├── range_strategy.py
│   │   │   ├── rl_strategy.py
│   │   │   ├── strategy_router.py
│   │   │   ├── vectorized_combined.py
│   │   │   ├── volatility_strategy.py
│   │   │   └── yuutai_strategy.py
│   │   ├── strategies_temp
│   │   │   ├── evolved_strategy.py
│   │   │   ├── hierarchical_strategy.py
│   │   │   ├── moe_strategy.py
│   │   │   ├── rl_strategy.py
│   │   │   └── yuutai_strategy.py
│   │   ├── tax
│   │   │   ├── __init__.py
│   │   │   ├── calculator.py
│   │   │   └── report.py
│   │   ├── trading
│   │   │   ├── __init__.py
│   │   │   ├── asset_selector.py
│   │   │   ├── collective_intelligence.py
│   │   │   ├── consensus_engine.py
│   │   │   ├── daily_reporter.py
│   │   │   ├── dao_client.py
│   │   │   ├── emergency_handler.py
│   │   │   ├── fully_automated_trader.py
│   │   │   ├── market_scanner.py
│   │   │   ├── portfolio_manager.py
│   │   │   ├── position_manager.py
│   │   │   ├── position_sizer.py
│   │   │   ├── README.md
│   │   │   ├── runner.py
│   │   │   ├── safety_checks.py
│   │   │   ├── tournament_manager.py
│   │   │   └── trade_executor.py
│   │   ├── ui_temp
│   │   │   ├── ui_ai_report.py
│   │   │   ├── ui_alerts.py
│   │   │   ├── ui_automation.py
│   │   │   ├── ui_components.py
│   │   │   ├── ui_customizer.py
│   │   │   ├── ui_export.py
│   │   │   ├── ui_ghostwriter.py
│   │   │   ├── ui_nisa.py
│   │   │   ├── ui_options.py
│   │   │   ├── ui_realtime.py
│   │   │   ├── ui_renderers.py
│   │   │   └── ui_tax.py
│   │   ├── utils
│   │   │   ├── __init__.py
│   │   │   ├── cache_mgr.py
│   │   │   ├── coding_standards.py
│   │   │   ├── currency.py
│   │   │   ├── data_utils.py
│   │   │   ├── db_utils.py
│   │   │   ├── error_handler.py
│   │   │   ├── health.py
│   │   │   ├── lazy_imports.py
│   │   │   ├── logger.py
│   │   │   ├── model_optimizer.py
│   │   │   ├── onnx_optimizer.py
│   │   │   ├── parallel_processor.py
│   │   │   ├── parameter_optimizer.py
│   │   │   ├── performance.py
│   │   │   ├── rate_limiter.py
│   │   │   ├── resilience.py
│   │   │   ├── self_healing.py
│   │   │   ├── self_learning.py
│   │   │   ├── setup.py
│   │   │   ├── state_engine.py
│   │   │   ├── tax_optimizer.py
│   │   │   └── voice_oracle.py
│   │   ├── utils_temp
│   │   │   ├── dashboard_utils.py
│   │   │   ├── helpers.py
│   │   │   ├── performance_utils.py
│   │   │   ├── platform_utils.py
│   │   │   ├── pnl_utils.py
│   │   │   └── security_utils.py
│   │   ├── __init__.py
│   │   ├── advanced_analytics.py
│   │   ├── advanced_ensemble.py
│   │   ├── advanced_features_v2.py
│   │   ├── advanced_models.py
│   │   ├── advanced_risk.py
│   │   ├── ai_advisor.py
│   │   ├── ai_analyst.py
│   │   ├── alert_manager.py
│   │   ├── alert_system.py
│   │   ├── approval_redis_store.py
│   │   ├── approval_system.py
│   │   ├── approval_workflow_demo.py
│   │   ├── async_data_loader.py
│   │   ├── async_fetcher.py
│   │   ├── attention_selector.py
│   │   ├── auth.py
│   │   ├── auth_middleware.py
│   │   ├── auto_rebalancer.py
│   │   ├── auto_selector.py
│   │   ├── auto_trader.py
│   │   ├── auto_trader_ui.py
│   │   ├── backtest_engine_legacy.py
│   │   ├── backtest_service.py
│   │   ├── backtester.py
│   │   ├── backup_manager.py
│   │   ├── base.py
│   │   ├── batch_inference.py
│   │   ├── benchmark_comparator.py
│   │   ├── bert_sentiment.py
│   │   ├── broker.py
│   │   ├── cache_manager.py
│   │   ├── chaos_engine.py
│   │   ├── circuit_breaker.py
│   │   ├── cloud_sync.py
│   │   ├── constants.py
│   │   ├── continual_learning.py
│   │   ├── continuous_learning.py
│   │   ├── cost_optimizer.py
│   │   ├── cross_validation.py
│   │   ├── database_manager.py
│   │   ├── db_maintenance.py
│   │   ├── deep_optimizer.py
│   │   ├── defi_blockchain_integration.py
│   │   ├── demo_data.py
│   │   ├── design_tokens.py
│   │   ├── di.py
│   │   ├── distributed_storage.py
│   │   ├── drift_monitor.py
│   │   ├── dynamic_ensemble.py
│   │   ├── dynamic_risk_manager.py
│   │   ├── dynamic_stop.py
│   │   ├── encryption.py
│   │   ├── enhanced_ai_prediction.py
│   │   ├── enhanced_features.py
│   │   ├── enhanced_performance_dashboard.py
│   │   ├── ensemble.py
│   │   ├── ensemble_weight_optimizer.py
│   │   ├── error_handling.py
│   │   ├── errors.py
│   │   ├── evolution_engine.py
│   │   ├── exceptions.py
│   │   ├── explainable_ai.py
│   │   ├── external_data.py
│   │   ├── feature_filter.py
│   │   ├── feedback_loop.py
│   │   ├── formatters.py
│   │   ├── fundamentals.py
│   │   ├── ghostwriter.py
│   │   ├── global_market_integration.py
│   │   ├── gpt4_vision.py
│   │   ├── gpu_accelerator.py
│   │   ├── horizon_expert.py
│   │   ├── hyperparameter_optimizer.py
│   │   ├── hyperparameter_tuning.py
│   │   ├── in_app_notifier.py
│   │   ├── integrated_signals.py
│   │   ├── intelligent_auto_selector.py
│   │   ├── japan_financial_statements.py
│   │   ├── japan_stock_data.py
│   │   ├── japan_tax_calculator.py
│   │   ├── kelly_criterion.py
│   │   ├── lazy_loader.py
│   │   ├── live_trading.py
│   │   ├── llm_reasoner.py
│   │   ├── market_access.py
│   │   ├── meta_optimizer.py
│   │   ├── metrics.py
│   │   ├── ml_pipeline.py
│   │   ├── ml_prediction_system.py
│   │   ├── mlops_manager.py
│   │   ├── moe_system.py
│   │   ├── morning_briefing_generator.py
│   │   ├── morning_strategy_memo.py
│   │   ├── multi_agent_trading.py
│   │   ├── multi_asset_analytics.py
│   │   ├── multi_task_learner.py
│   │   ├── multi_timeframe.py
│   │   ├── neuro_evolution.py
│   │   ├── news_aggregator.py
│   │   ├── news_collector.py
│   │   ├── notification_system.py
│   │   ├── notifier.py
│   │   ├── online_learning.py
│   │   ├── online_lgbm.py
│   │   ├── optimizer.py
│   │   ├── options_pricing.py
│   │   ├── paper_trader.py
│   │   ├── parallel_backtester.py
│   │   ├── paths.py
│   │   ├── patterns.py
│   │   ├── performance.py
│   │   ├── performance_attribution.py
│   │   ├── performance_calculator.py
│   │   ├── performance_collector.py
│   │   ├── performance_dashboard.py
│   │   ├── performance_metrics.py
│   │   ├── performance_monitor.py
│   │   ├── performance_optimizer.py
│   │   ├── persistent_cache.py
│   │   ├── personal_assistant.py
│   │   ├── portfolio.py
│   │   ├── portfolio_manager.py
│   │   ├── portfolio_optimizer.py
│   │   ├── portfolio_rebalancer.py
│   │   ├── portfolio_risk.py
│   │   ├── prediction_backtester.py
│   │   ├── prediction_cache.py
│   │   ├── prediction_dashboard.py
│   │   ├── production_manager.py
│   │   ├── prompts.py
│   │   ├── psychological_guard.py
│   │   ├── push_notifications.py
│   │   ├── pytest_cov_optional.py
│   │   ├── rakuten_broker.py
│   │   ├── realtime_analytics.py
│   │   ├── realtime_data.py
│   │   ├── rebalancer.py
│   │   ├── recovery_manager.py
│   │   ├── regime.py
│   │   ├── regime_detector.py
│   │   ├── responsive_ui.py
│   │   ├── result_aggregator.py
│   │   ├── rich_notifier.py
│   │   ├── risk_adjusted_prediction.py
│   │   ├── risk_guard.py
│   │   ├── risk_limiter.py
│   │   ├── rl_agent.py
│   │   ├── rl_environment.py
│   │   ├── rl_trainer.py
│   │   ├── safety_manager.py
│   │   ├── schemas.py
│   │   ├── sector_rotation.py
│   │   ├── sentiment.py
│   │   ├── sentiment_analytics.py
│   │   ├── sentiment_tracker.py
│   │   ├── simple_dashboard.py
│   │   ├── simulator.py
│   │   ├── simulator_core.py
│   │   ├── simulator_main.py
│   │   ├── skill_search.py
│   │   ├── smart_alerts.py
│   │   ├── smart_cache.py
│   │   ├── smart_notifier.py
│   │   ├── social_sentiment.py
│   │   ├── sovereign_retrospective.py
│   │   ├── stacking_ensemble.py
│   │   ├── startup_optimizer.py
│   │   ├── streaming_pipeline.py
│   │   ├── tax_calculator.py
│   │   ├── test_walkforward_lightgbm.py
│   │   ├── timeseries_cv.py
│   │   ├── trade_explainer.py
│   │   ├── trading_cost.py
│   │   ├── transformer_model.py
│   │   ├── trust_engine.py
│   │   ├── typed_core_functions.py
│   │   ├── types.py
│   │   ├── vector_backtester.py
│   │   ├── vibe_trader.py
│   │   ├── visualizer.py
│   │   ├── voice_interface.py
│   │   ├── walk_forward.py
│   │   ├── walkforward_blender.py
│   │   ├── walkforward_lightgbm.py
│   │   ├── websocket_notifier.py
│   │   └── xai_explainer.py
│   ├── tests
│   │   ├── core
│   │   │   ├── test_agent_loop.py
│   │   │   └── test_schemas.py
│   │   ├── security
│   │   │   └── test_circuit_breaker.py
│   │   ├── services
│   │   │   └── test_approval_service.py
│   │   ├── test_agents.py
│   │   ├── test_api_endpoints.py
│   │   ├── test_api_integration.py
│   │   ├── test_approval_persistence.py
│   │   ├── test_auto_trader.py
│   │   ├── test_chaos.py
│   │   ├── test_config.py
│   │   ├── test_database.py
│   │   ├── test_genetic_optimizer.py
│   │   ├── test_vibe_trading.py
│   │   └── test_websocket.py
│   ├── vaderSentiment
│   │   ├── __init__.py
│   │   └── vaderSentiment.py
│   ├── backend_error_log.txt
│   ├── backend_error_log_v10.txt
│   ├── backend_error_log_v2.txt
│   ├── backend_error_log_v3.txt
│   ├── backend_error_log_v4.txt
│   ├── backend_error_log_v5.txt
│   ├── backend_error_log_v6.txt
│   ├── backend_error_log_v7.txt
│   ├── backend_error_log_v9.txt
│   ├── backend_test_log.txt
│   ├── backend_test_log_v2.txt
│   ├── backend_test_log_v3.txt
│   ├── backend_test_log_v4.txt
│   ├── backend_test_log_v5.txt
│   ├── backend_test_log_v6.txt
│   ├── cache.db
│   ├── config.json
│   ├── debug_db.py
│   ├── debug_portfolio.py
│   ├── debug_signals.py
│   ├── debug_trade.py
│   ├── main.py
│   ├── requirements.txt
│   ├── run_sovereign.py
│   ├── stock_data.db
│   ├── ult_trading.db
│   ├── ult_trading.db-shm
│   └── ult_trading.db-wal
├── brainstorm_results
│   ├── accuracy_debate.md
│   ├── can_we_win_debate.md
│   ├── edge_inference_debate.md
│   ├── emergency_session_debate.md
│   ├── liquidity_trap_debate.md
│   ├── next_phase_debate.md
│   ├── next_phase_decision.md
│   ├── next_steps_debate.md
│   ├── phase10_debate.md
│   ├── phase11_5_implementation_debate.md
│   ├── phase11_5_ui_review_debate.md
│   ├── phase11_debate.md
│   ├── phase11_diary_debate.md
│   ├── phase11_ui_debate.md
│   ├── phase13_5_optimization_debate.md
│   ├── phase13_arsenal_debate.md
│   ├── phase14_blacksmith_debate.md
│   ├── phase15_5_review.md
│   ├── phase15_debate.md
│   ├── phase15_mechanical_hive.md
│   ├── phase15_review.md
│   ├── phase17_debate.md
│   ├── phase4_missing_check.md
│   ├── phase5_next_priority.md
│   ├── phase5_strategy.md
│   ├── phase5_strategy_debate.md
│   ├── phase5_strategy_debate_v2.md
│   ├── phase5_voice_debate.md
│   ├── profitability_debate.md
│   ├── r1_accuracy_glm.txt
│   ├── r1_accuracy_minimax.txt
│   ├── r1_accuracy_pickle.txt
│   ├── r1_accuracy_qwen.txt
│   ├── r1_glm.txt
│   ├── r1_glm_p5.txt
│   ├── r1_minimax_p5.txt
│   ├── r1_pickle.txt
│   ├── r1_pickle_p5.txt
│   ├── r1_profit_glm.txt
│   ├── r1_profit_minimax.txt
│   ├── r1_profit_pickle.txt
│   ├── r1_profit_qwen.txt
│   ├── r1_qwen.txt
│   ├── r1_qwen_p5.txt
│   ├── r2_minimax_attack.txt
│   ├── r2_qwen_attack.txt
│   ├── retrospective_patch_4_5.md
│   ├── ui_audit_report.md
│   ├── ui_fix_prioritization_debate.md
│   ├── ui_review_summary.md
│   └── ui_skills_review.md
├── data
│   ├── parquet
│   │   ├── 6471.T.parquet
│   │   ├── 6501.T.parquet
│   │   ├── 6954.T.parquet
│   │   ├── 7203.T.parquet
│   │   ├── CL=F.parquet
│   │   ├── GC=F.parquet
│   │   ├── GOLD.parquet
│   │   ├── GSPC.parquet
│   │   ├── JPY=X.parquet
│   │   ├── N225.parquet
│   │   ├── TNX.parquet
│   │   └── VIX.parquet
│   ├── screenshots
│   ├── agstock.db
│   └── stock_data.db
├── docs
│   ├── API.md
│   ├── APPROVAL_QUICKSTART.md
│   └── APPROVAL_WORKFLOW_GUIDE.md
├── e2e
│   └── app.spec.ts
├── k8s
│   └── deployment.yml
├── logs
│   ├── walkforward_analysis
│   │   └── 20260119_070621
│   │       ├── confusion_matrix.png
│   │       ├── feature_importance.csv
│   │       ├── performance_over_time.png
│   │       ├── split_results.csv
│   │       └── WALKFORWARD_ANALYSIS_REPORT.md
│   ├── agstock.log
│   └── error.log
├── models
├── public
│   ├── edge-worker.js
│   ├── file.svg
│   ├── globe.svg
│   ├── grid-pattern.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── skills-dev
│   └── trading-system-orchestrator
│       ├── scripts
│       │   ├── run_verification.cjs
│       │   └── start_system.cjs
│       └── SKILL.md
├── src
│   ├── __tests__
│   │   └── components
│   │       ├── dashboard
│   │       │   └── SignalCard.test.tsx
│   │       └── visualizations
│   │           └── EcosystemGraph.test.tsx
│   ├── app
│   │   ├── api
│   │   │   ├── notifications
│   │   │   │   └── route.ts
│   │   │   └── portfolio
│   │   │       └── route.ts
│   │   ├── edge
│   │   │   └── page.tsx
│   │   ├── market
│   │   │   └── page.tsx
│   │   ├── matrix-demo
│   │   │   └── page.tsx
│   │   ├── monitor
│   │   │   └── page.tsx
│   │   ├── notifications-test
│   │   │   └── page.tsx
│   │   ├── portfolio
│   │   │   └── page.tsx
│   │   ├── quantum-oracle
│   │   │   ├── page.tsx
│   │   │   └── QuantumOracleClient.tsx
│   │   ├── settings
│   │   │   └── page.tsx
│   │   ├── stocks
│   │   │   └── [ticker]
│   │   │       └── page.tsx
│   │   ├── xr
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── global-error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── demo
│   │   │   └── SwipeNotificationDemo.tsx
│   │   ├── features
│   │   │   ├── analytics
│   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   │   └── TradeReplayWidget.tsx
│   │   │   ├── approvals
│   │   │   │   ├── ApprovalCard.tsx
│   │   │   │   ├── ApprovalCardsDemo.tsx
│   │   │   │   └── ApprovalCardsProvider.tsx
│   │   │   ├── circuit-breaker
│   │   │   │   └── circuit-breaker-panel.tsx
│   │   │   ├── dashboard
│   │   │   │   ├── AIAdvisorPanel.tsx
│   │   │   │   ├── AIAgentAvatar.tsx
│   │   │   │   ├── AssetAllocation.tsx
│   │   │   │   ├── AutoTradeControls.tsx
│   │   │   │   ├── CockpitPanel.tsx
│   │   │   │   ├── DashboardOnboarding.tsx
│   │   │   │   ├── DecisionTree.tsx
│   │   │   │   ├── EarningsCountdown.tsx
│   │   │   │   ├── EarningsHunterPanel.tsx
│   │   │   │   ├── HivePanel.tsx
│   │   │   │   ├── MacroStrip.tsx
│   │   │   │   ├── MarketStatusCard.tsx
│   │   │   │   ├── MatrixPortfolioSummary.tsx
│   │   │   │   ├── MatrixPositionList.tsx
│   │   │   │   ├── NeuralLoader.tsx
│   │   │   │   ├── NeuralMonitorBasic.tsx
│   │   │   │   ├── NeuralNetwork.tsx
│   │   │   │   ├── NeuralTradingDaemon.tsx
│   │   │   │   ├── NewsShockRadar.tsx
│   │   │   │   ├── OracleWidget.tsx
│   │   │   │   ├── PortfolioSummary.tsx
│   │   │   │   ├── PositionList.tsx
│   │   │   │   ├── PositionRow.tsx
│   │   │   │   ├── PriceAlerts.tsx
│   │   │   │   ├── PriceChart.tsx
│   │   │   │   ├── SignalCard.tsx
│   │   │   │   ├── SystemMonitor.tsx
│   │   │   │   ├── TimeMachinePanel.tsx
│   │   │   │   ├── TinderTradeCard.tsx
│   │   │   │   ├── TinderTrader.tsx
│   │   │   │   ├── TradingModal.tsx
│   │   │   │   └── VisualThinking.tsx
│   │   │   ├── edge
│   │   │   │   ├── EdgeInferenceWidget.tsx
│   │   │   │   ├── EdgeNewsRefinery.tsx
│   │   │   │   └── sentiment.worker.ts
│   │   │   ├── journal
│   │   │   │   ├── DiaryGallery.tsx
│   │   │   │   └── ScreenshotCard.tsx
│   │   │   ├── vision
│   │   │   │   ├── DiaryGallery.tsx
│   │   │   │   └── VisionPanel.tsx
│   │   │   ├── xr
│   │   │   │   ├── InteractiveStockGalaxy.tsx
│   │   │   │   ├── MinorityReportXR.tsx
│   │   │   │   ├── QuantumTradingOracle.tsx
│   │   │   │   ├── README.md
│   │   │   │   ├── SPCorrelationGalaxy.tsx
│   │   │   │   └── VoidScene.tsx
│   │   │   └── NeuralMonitor.tsx
│   │   ├── layout
│   │   │   ├── GlobalAlertOverlay.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── notifications
│   │   │   └── NotificationSystem.tsx
│   │   ├── shared
│   │   │   ├── hooks
│   │   │   │   ├── __tests__
│   │   │   │   │   └── useAsyncData.test.ts
│   │   │   │   ├── business
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useApprovalRequests.ts
│   │   │   │   │   ├── useApprovalSync.ts
│   │   │   │   │   ├── useCircuitBreaker.ts
│   │   │   │   │   ├── usePnL.ts
│   │   │   │   │   └── usePositionRow.ts
│   │   │   │   ├── ui
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── useAlert.ts
│   │   │   │   │   └── useNotificationManager.ts
│   │   │   │   ├── common.ts
│   │   │   │   ├── connection.ts
│   │   │   │   ├── stubs.ts
│   │   │   │   ├── useAsyncData.ts
│   │   │   │   └── useNotificationManager.ts
│   │   │   ├── utils
│   │   │   │   ├── api.ts
│   │   │   │   ├── common.ts
│   │   │   │   ├── pca.ts
│   │   │   │   ├── sounds.ts
│   │   │   │   └── utils.ts
│   │   │   ├── index.ts
│   │   │   ├── Loading.tsx
│   │   │   └── websocket.ts
│   │   ├── ui
│   │   │   ├── __tests__
│   │   │   │   └── data-table.test.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── glitch-text.tsx
│   │   │   ├── input.tsx
│   │   │   ├── json-stream.tsx
│   │   │   ├── label.tsx
│   │   │   ├── matrix-rain.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── switch.tsx
│   │   │   └── tabs.tsx
│   │   ├── visualizations
│   │   │   └── EcosystemGraph.tsx
│   │   ├── ApprovalToast.tsx
│   │   ├── CircuitBreakerStatus.tsx
│   │   ├── DangerWarning.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── MetricsGrid.tsx
│   │   ├── NeuralMonitorAdvanced.tsx
│   │   ├── NeuralMonitorUI.tsx
│   │   ├── PerformanceMonitor.tsx
│   │   ├── ToastSystem.tsx
│   │   ├── TrafficLight.test.tsx
│   │   └── TrafficLight.tsx
│   ├── data
│   │   └── mockEcosystem.ts
│   ├── hooks
│   │   ├── useChartCapture.ts
│   │   ├── useExecuteTrade.ts
│   │   └── useSpeech.ts
│   ├── i18n
│   │   └── request.ts
│   ├── lib
│   │   ├── ai
│   │   │   └── EdgeAIClient.ts
│   │   ├── store
│   │   │   └── neuralStore.ts
│   │   ├── api.ts
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   └── utils.ts
│   ├── messages
│   │   ├── en.json
│   │   └── ja.json
│   ├── providers
│   │   ├── QueryProvider.tsx
│   │   └── ThemeProvider.tsx
│   └── types
│       ├── dom-to-image-more.d.ts
│       ├── index.ts
│       └── phase5.ts
├── tests
│   ├── test_agent_integration.py
│   ├── test_regime_classifier.py
│   ├── test_risk_veto.py
│   ├── test_sovereign_cycle.py
│   ├── test_strategies_v2.py
│   ├── test_vision_journal.py
│   ├── verify_hive.py
│   ├── verify_news.py
│   └── verify_vision_consensus.py
├── check_db.py
├── check_db_v2.py
├── check_db_v2_backend.py
├── CODEMAP.md
├── components.json
├── debug_portfolio.py
├── docker-compose.yml
├── eslint.config.js
├── frontend_build_log.txt
├── frontend_build_log_v10.txt
├── frontend_build_log_v11.txt
├── frontend_build_log_v12.txt
├── frontend_build_log_v13.txt
├── frontend_build_log_v14.txt
├── frontend_build_log_v15.txt
├── frontend_build_log_v16.txt
├── frontend_build_log_v17.txt
├── frontend_build_log_v18.txt
├── frontend_build_log_v19.txt
├── frontend_build_log_v2.txt
├── frontend_build_log_v20.txt
├── frontend_build_log_v21.txt
├── frontend_build_log_v22.txt
├── frontend_build_log_v23.txt
├── frontend_build_log_v24.txt
├── frontend_build_log_v25.txt
├── frontend_build_log_v26.txt
├── frontend_build_log_v27.txt
├── frontend_build_log_v28.txt
├── frontend_build_log_v29.txt
├── frontend_build_log_v3.txt
├── frontend_build_log_v30.txt
├── frontend_build_log_v31.txt
├── frontend_build_log_v32.txt
├── frontend_build_log_v33.txt
├── frontend_build_log_v34.txt
├── frontend_build_log_v35.txt
├── frontend_build_log_v36.txt
├── frontend_build_log_v37.txt
├── frontend_build_log_v38.txt
├── frontend_build_log_v39.txt
├── frontend_build_log_v4.txt
├── frontend_build_log_v40.txt
├── frontend_build_log_v41.txt
├── frontend_build_log_v42.txt
├── frontend_build_log_v43.txt
├── frontend_build_log_v44.txt
├── frontend_build_log_v45.txt
├── frontend_build_log_v46.txt
├── frontend_build_log_v47.txt
├── frontend_build_log_v48.txt
├── frontend_build_log_v49.txt
├── frontend_build_log_v5.txt
├── frontend_build_log_v50.txt
├── frontend_build_log_v51.txt
├── frontend_build_log_v52.txt
├── frontend_build_log_v53.txt
├── frontend_build_log_v54.txt
├── frontend_build_log_v55.txt
├── frontend_build_log_v56.txt
├── frontend_build_log_v57.txt
├── frontend_build_log_v58.txt
├── frontend_build_log_v59.txt
├── frontend_build_log_v6.txt
├── frontend_build_log_v60.txt
├── frontend_build_log_v7.txt
├── frontend_build_log_v8.txt
├── frontend_build_log_v9.txt
├── frontend_test_log.txt
├── frontend_test_log_v2.txt
├── frontend_test_log_v3.txt
├── frontend_test_log_v4.txt
├── frontend_test_log_v5.txt
├── frontend_test_log_v6.txt
├── GEMINI.md
├── jest.config.cjs
├── jest.setup.js
├── LEARNINGS.md
├── living-nexus-guardian.skill
├── mypy.ini
├── next-env.d.ts
├── next.config.js
├── next.config.ts.bak
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── pr_body_phases15-17.md
├── README.md
├── seed_portfolio.py
├── sovereign.log
├── stock_data.db
├── task.md
├── test_autotrade_api.py
├── test_import.py
├── test_reset.py
├── test_yf.py
├── trading-system-orchestrator.skill
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── typedoc.json
├── ult_trading.db
├── ult_trading.db-shm
├── ult_trading.db-wal
├── verify_db_config.py
├── verify_earnings.py
├── verify_earnings_api.py
├── verify_shock_defense.py
├── verify_strategy_router.py
├── verify_time_machine.py
└── walkthrough.md
```
