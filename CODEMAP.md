# Project CodeMap

Generated on: Ult

```
├── backend
│   ├── data
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
│   │   ├── agstock.db
│   │   └── stock_data.db
│   ├── logs
│   ├── models
│   ├── src
│   │   ├── agents
│   │   │   ├── __init__.py
│   │   │   ├── base_agent.py
│   │   │   ├── committee.py
│   │   │   ├── neuromancer.py
│   │   │   ├── risk_manager.py
│   │   │   └── rl_agent_wrapper.py
│   │   ├── analysis
│   │   │   ├── __init__.py
│   │   │   ├── monte_carlo.py
│   │   │   ├── multi_timeframe.py
│   │   │   ├── multimodal_analyzer.py
│   │   │   ├── pdf_reader.py
│   │   │   └── performance_analyzer.py
│   │   ├── api
│   │   │   ├── routers
│   │   │   │   ├── __init__.py
│   │   │   │   ├── alerts.py
│   │   │   │   ├── approvals.py
│   │   │   │   ├── circuit_breaker.py
│   │   │   │   ├── market.py
│   │   │   │   ├── portfolio.py
│   │   │   │   ├── replay.py
│   │   │   │   ├── settings.py
│   │   │   │   ├── settings_temp_check.py
│   │   │   │   ├── shock_radar.py
│   │   │   │   ├── trading.py
│   │   │   │   └── websocket.py
│   │   │   ├── __init__.py
│   │   │   ├── dependencies.py
│   │   │   ├── schemas.py
│   │   │   ├── server.py
│   │   │   ├── vibe_endpoints.py
│   │   │   ├── websocket_broadcaster.py
│   │   │   ├── websocket_manager.py
│   │   │   └── websocket_types.py
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
│   │   │   ├── earnings_history.py
│   │   │   ├── earnings_provider.py
│   │   │   ├── feedback_store.py
│   │   │   ├── macro_loader.py
│   │   │   ├── sentiment_correlator.py
│   │   │   ├── universe_manager.py
│   │   │   ├── us_market_monitor.py
│   │   │   └── whale_tracker.py
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
│   │   │   └── secure_data_manager.py
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
│   │   │   ├── evolved_strategy.py
│   │   │   ├── hedging_manager.py
│   │   │   ├── hierarchical_strategy.py
│   │   │   ├── hybrid.py
│   │   │   ├── loader.py
│   │   │   ├── meta_registry.py
│   │   │   ├── moe_strategy.py
│   │   │   ├── options_strategy.py
│   │   │   ├── orchestrator.py
│   │   │   ├── rl_strategy.py
│   │   │   ├── vectorized_combined.py
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
│   │   ├── analytics.py
│   │   ├── api_server.py
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
│   │   ├── base_predictor.py
│   │   ├── batch_inference.py
│   │   ├── benchmark_comparator.py
│   │   ├── bert_sentiment.py
│   │   ├── broker.py
│   │   ├── cache_config.py
│   │   ├── cache_manager.py
│   │   ├── chaos_engine.py
│   │   ├── circuit_breaker.py
│   │   ├── cloud_sync.py
│   │   ├── config.py
│   │   ├── config_manager.py
│   │   ├── constants.py
│   │   ├── continual_learning.py
│   │   ├── cost_optimizer.py
│   │   ├── cross_validation.py
│   │   ├── dashboard_utils.py
│   │   ├── data_augmenter.py
│   │   ├── data_loader.py
│   │   ├── data_manager.py
│   │   ├── data_preprocessing.py
│   │   ├── data_processor.py
│   │   ├── data_quality.py
│   │   ├── data_quality_guard.py
│   │   ├── database_manager.py
│   │   ├── db_maintenance.py
│   │   ├── deep_optimizer.py
│   │   ├── defi_blockchain_integration.py
│   │   ├── demo_data.py
│   │   ├── design_tokens.py
│   │   ├── distributed_storage.py
│   │   ├── drift_monitor.py
│   │   ├── dynamic_ensemble.py
│   │   ├── dynamic_risk_manager.py
│   │   ├── dynamic_stop.py
│   │   ├── encryption.py
│   │   ├── enhanced_ai_prediction.py
│   │   ├── enhanced_ensemble_predictor.py
│   │   ├── enhanced_features.py
│   │   ├── enhanced_performance_dashboard.py
│   │   ├── ensemble.py
│   │   ├── ensemble_predictor.py
│   │   ├── ensemble_weight_optimizer.py
│   │   ├── error_handling.py
│   │   ├── errors.py
│   │   ├── evolution_engine.py
│   │   ├── evolved_strategy.py
│   │   ├── exceptions.py
│   │   ├── explainable_ai.py
│   │   ├── external_data.py
│   │   ├── feature_filter.py
│   │   ├── feedback_loop.py
│   │   ├── formatters.py
│   │   ├── fundamental_analyzer.py
│   │   ├── fundamentals.py
│   │   ├── future_predictor.py
│   │   ├── ghostwriter.py
│   │   ├── global_market_integration.py
│   │   ├── gpt4_vision.py
│   │   ├── gpu_accelerator.py
│   │   ├── helpers.py
│   │   ├── hierarchical_strategy.py
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
│   │   ├── lgbm_predictor.py
│   │   ├── live_trading.py
│   │   ├── llm_analyzer.py
│   │   ├── llm_reasoner.py
│   │   ├── log_config.py
│   │   ├── logger_config.py
│   │   ├── logging_config.py
│   │   ├── lstm_predictor.py
│   │   ├── market_access.py
│   │   ├── meta_optimizer.py
│   │   ├── metrics.py
│   │   ├── ml_pipeline.py
│   │   ├── ml_prediction_system.py
│   │   ├── mlops_manager.py
│   │   ├── moe_strategy.py
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
│   │   ├── pdf_report_generator.py
│   │   ├── performance.py
│   │   ├── performance_analyzer.py
│   │   ├── performance_attribution.py
│   │   ├── performance_calculator.py
│   │   ├── performance_collector.py
│   │   ├── performance_dashboard.py
│   │   ├── performance_metrics.py
│   │   ├── performance_monitor.py
│   │   ├── performance_optimizer.py
│   │   ├── performance_utils.py
│   │   ├── persistent_cache.py
│   │   ├── personal_assistant.py
│   │   ├── platform_utils.py
│   │   ├── pnl_utils.py
│   │   ├── portfolio.py
│   │   ├── portfolio_analyzer.py
│   │   ├── portfolio_manager.py
│   │   ├── portfolio_optimizer.py
│   │   ├── portfolio_rebalancer.py
│   │   ├── portfolio_risk.py
│   │   ├── prediction_backtester.py
│   │   ├── prediction_cache.py
│   │   ├── prediction_dashboard.py
│   │   ├── production_manager.py
│   │   ├── prompts.py
│   │   ├── prophet_predictor.py
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
│   │   ├── rl_strategy.py
│   │   ├── rl_trainer.py
│   │   ├── safety_manager.py
│   │   ├── scenario_analyzer.py
│   │   ├── schemas.py
│   │   ├── sector_rotation.py
│   │   ├── security_utils.py
│   │   ├── sentiment.py
│   │   ├── sentiment_analytics.py
│   │   ├── sentiment_analyzer.py
│   │   ├── sentiment_tracker.py
│   │   ├── simple_dashboard.py
│   │   ├── simulator.py
│   │   ├── simulator_core.py
│   │   ├── simulator_main.py
│   │   ├── smart_alerts.py
│   │   ├── smart_cache.py
│   │   ├── smart_notifier.py
│   │   ├── social_sentiment.py
│   │   ├── sovereign_retrospective.py
│   │   ├── stacking_ensemble.py
│   │   ├── startup_optimizer.py
│   │   ├── streaming_pipeline.py
│   │   ├── tax_calculator.py
│   │   ├── tax_report_generator.py
│   │   ├── test_walkforward_lightgbm.py
│   │   ├── timeseries_cv.py
│   │   ├── trade_explainer.py
│   │   ├── trading_cost.py
│   │   ├── transformer_model.py
│   │   ├── transformer_predictor.py
│   │   ├── trust_engine.py
│   │   ├── typed_core_functions.py
│   │   ├── types.py
│   │   ├── ui_ai_report.py
│   │   ├── ui_alerts.py
│   │   ├── ui_automation.py
│   │   ├── ui_components.py
│   │   ├── ui_customizer.py
│   │   ├── ui_export.py
│   │   ├── ui_ghostwriter.py
│   │   ├── ui_nisa.py
│   │   ├── ui_options.py
│   │   ├── ui_realtime.py
│   │   ├── ui_renderers.py
│   │   ├── ui_tax.py
│   │   ├── vector_backtester.py
│   │   ├── vibe_trader.py
│   │   ├── visualizer.py
│   │   ├── voice_interface.py
│   │   ├── walk_forward.py
│   │   ├── walkforward_blender.py
│   │   ├── walkforward_lightgbm.py
│   │   ├── websocket_notifier.py
│   │   ├── xai_explainer.py
│   │   └── yuutai_strategy.py
│   ├── tests
│   │   ├── core
│   │   │   ├── test_agent_loop.py
│   │   │   └── test_schemas.py
│   │   ├── security
│   │   │   └── test_circuit_breaker.py
│   │   ├── services
│   │   │   └── test_approval_service.py
│   │   ├── test_api_integration.py
│   │   ├── test_api_structure.py
│   │   ├── test_approval_persistence.py
│   │   ├── test_auto_trader.py
│   │   ├── test_chaos.py
│   │   ├── test_vibe_trading.py
│   │   └── test_websocket.py
│   ├── cache.db
│   ├── config.json
│   ├── main.py
│   ├── requirements.txt
│   ├── stock_data.db
│   ├── ult_trading.db
│   ├── ult_trading.db-shm
│   └── ult_trading.db-wal
├── brainstorm_results
│   ├── accuracy_debate.md
│   ├── adaptive_regime_concept.png
│   ├── big_pickle_roast_glm_react.md
│   ├── brainstorm_skill_review.md
│   ├── bug_fixing_meeting.md
│   ├── cleanup_meeting.md
│   ├── conference_room.md
│   ├── conference_room_v2.md
│   ├── council_conflict_test.md
│   ├── council_verification.md
│   ├── data_starvation_meeting.md
│   ├── earnings_hunter_meeting.md
│   ├── edge_inference_debate.md
│   ├── interactive_session.md
│   ├── interactive_session_v2.md
│   ├── living_nexus_concept.png
│   ├── next_steps.md
│   ├── next_steps_decision.md
│   ├── next_steps_discussion.md
│   ├── next_steps_meeting.md
│   ├── next_steps_v2.md
│   ├── next_steps_v3.md
│   ├── phase10_debate.md
│   ├── phase3_conflict_debate.md
│   ├── phase4_agent_loop_priority.md
│   ├── phase4_autonomy_debate.md
│   ├── phase4_execution_strategy.md
│   ├── phase4_missing_check.md
│   ├── phase4_ops_debate.md
│   ├── phase4_ops_technical.md
│   ├── phase4_priority_debate.md
│   ├── phase4_semi_auto_complete.md
│   ├── phase4_ui_design.md
│   ├── phase5_galaxy_design.md
│   ├── phase5_next_priority.md
│   ├── phase5_priority_debate.md
│   ├── phase5_singularity_proposal.md
│   ├── phase5_singularity_roadmap.md
│   ├── phase5_strategy.md
│   ├── phase5_strategy_debate.md
│   ├── phase5_strategy_debate_v2.md
│   ├── phase5_webxr_design.md
│   ├── phase_next_priority_debate.md
│   ├── profitability_debate.md
│   ├── profitability_meeting.md
│   ├── protocol_test.md
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
│   ├── recalibration_meeting.md
│   ├── recalibration_meeting_final.md
│   ├── retrospective_patch_4_5.md
│   ├── risk_assessment_meeting.md
│   ├── sensitivity_meeting.md
│   ├── source_review_meeting.md
│   ├── ui_design_meeting.md
│   ├── ui_skills_review.md
│   ├── ui_touch_review.md
│   ├── ult_improvements.md
│   ├── ult_improvements_v2.md
│   ├── visual_evaluation_meeting.md
│   └── zero_data_meeting.md
├── data
│   ├── parquet
│   │   ├── 4062.T.parquet
│   │   ├── 6758.T.parquet
│   │   ├── 6857.T.parquet
│   │   ├── 6920.T.parquet
│   │   ├── 7203.T.parquet
│   │   ├── 8035.T.parquet
│   │   ├── 9984.T.parquet
│   │   ├── CL=F.parquet
│   │   ├── GC=F.parquet
│   │   ├── GSPC.parquet
│   │   ├── JPY=X.parquet
│   │   ├── N225.parquet
│   │   ├── TNX.parquet
│   │   └── VIX.parquet
│   ├── agstock.db
│   └── stock_data.db
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
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src
│   ├── __tests__
│   │   └── components
│   │       ├── dashboard
│   │       │   └── SignalCard.test.tsx
│   │       └── visualizations
│   │           └── EcosystemGraph.test.tsx
│   ├── app
│   │   ├── api
│   │   │   └── notifications
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
│   │   │   └── page.tsx
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
│   │   │   │   ├── DashboardOnboarding.tsx
│   │   │   │   ├── DecisionTree.tsx
│   │   │   │   ├── EarningsCountdown.tsx
│   │   │   │   ├── EarningsHunterPanel.tsx
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
│   │   │   │   ├── TinderTradeCard.tsx
│   │   │   │   ├── TinderTrader.tsx
│   │   │   │   ├── TradingModal.tsx
│   │   │   │   └── VisualThinking.tsx
│   │   │   ├── edge
│   │   │   │   ├── EdgeInferenceWidget.tsx
│   │   │   │   └── sentiment.worker.ts
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
│   │   │   │   ├── common.ts
│   │   │   │   ├── useAlert.ts
│   │   │   │   ├── useApprovalRequests.ts
│   │   │   │   ├── useApprovalSync.ts
│   │   │   │   ├── useCircuitBreaker.ts
│   │   │   │   ├── useNotificationManager.ts
│   │   │   │   ├── usePnL.ts
│   │   │   │   ├── usePositionRow.ts
│   │   │   │   └── useSynapse.ts
│   │   │   ├── utils
│   │   │   │   ├── api.ts
│   │   │   │   ├── common.ts
│   │   │   │   ├── pca.ts
│   │   │   │   ├── sounds.ts
│   │   │   │   └── utils.ts
│   │   │   ├── index.ts
│   │   │   ├── types-phase5.ts
│   │   │   ├── types.ts
│   │   │   └── websocket.ts
│   │   ├── ui
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── glitch-text.tsx
│   │   │   ├── input.tsx
│   │   │   ├── json-stream.tsx
│   │   │   ├── label.tsx
│   │   │   ├── matrix-rain.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── switch.tsx
│   │   │   └── tabs.tsx
│   │   ├── visualizations
│   │   │   └── EcosystemGraph.tsx
│   │   ├── ApprovalToast.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── NeuralMonitorAdvanced.tsx
│   │   └── NeuralMonitorUI.tsx
│   ├── data
│   │   └── mockEcosystem.ts
│   ├── lib
│   │   ├── ai
│   │   │   └── EdgeAIClient.ts
│   │   └── store
│   │       └── neuralStore.ts
│   └── providers
│       ├── QueryProvider.tsx
│       └── ThemeProvider.tsx
├── webxr-galaxy
│   └── index.html
├── APPROVAL_QUICKSTART.md
├── APPROVAL_WORKFLOW_GUIDE.md
├── cache.db
├── CODEMAP.md
├── components.json
├── eslint.config.mjs
├── GEMINI.md
├── implementation_plan.md
├── jest.config.js
├── jest.setup.js
├── LEARNINGS.md
├── neural-monitor-case.md
├── neuro-symbiotic-interface.md
├── next-env.d.ts
├── next.config.ts
├── nul
├── OPS_SECURITY_DESIGN.md
├── package-lock.json
├── package.json
├── PHASE3_QUICKSTART.md
├── PHASE3_WEBSOCKET_ARCHITECTURE.md
├── postcss.config.mjs
├── README.md
├── redis-memory-argument.md
├── REFACTORING_SUMMARY.md
├── source_review.md
├── stock_data.db
├── task.md
├── test_approval_cards.py
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── verify_earnings.py
├── verify_shock_defense.py
├── verify_time_machine.py
└── walkthrough.md
```
