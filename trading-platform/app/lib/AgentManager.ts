
import { AgentSystem } from './AgentSystem';
import { MarketDataSkill, TradingSkill, RiskManagementSkill } from './AgentSystem/skills';

/**
 * AgentManager - Facade for the Agent System
 *
 * This class provides a high-level interface for interacting with the agent system,
 * delegating actual logic to the specialized agents and skills.
 */
export class AgentManager {
  private system: AgentSystem;
  private marketSkill: MarketDataSkill;
  private tradingSkill: TradingSkill;
  private riskSkill: RiskManagementSkill;

  constructor() {
    this.system = new AgentSystem();
    this.marketSkill = new MarketDataSkill();
    this.tradingSkill = new TradingSkill();
    this.riskSkill = new RiskManagementSkill();

    this.initializeAgents();
  }

  private initializeAgents() {
    // Initialize core agents with their primary skills
    const marketAgent = this.system.createAgent('market_analyst', 'Market Analyst');
    marketAgent.addSkill(this.marketSkill);

    const tradingAgent = this.system.createAgent('trading_bot', 'Trading Bot');
    tradingAgent.addSkill(this.tradingSkill);
    tradingAgent.addSkill(this.riskSkill);

    const riskManager = this.system.createAgent('risk_manager', 'Risk Manager');
    riskManager.addSkill(this.riskSkill);
  }

  /**
   * Analyze market conditions for a specific symbol
   */
  public async analyzeMarket(symbol: string): Promise<any> {
    const agent = this.system.getAgent('market_analyst');
    if (!agent) throw new Error('Market Analyst agent not found');

    return agent.executeSkill('analyze_market', { symbol });
  }

  /**
   * Execute a trade with risk checks
   */
  public async executeTrade(symbol: string, action: 'BUY' | 'SELL', quantity: number): Promise<any> {
    const tradingAgent = this.system.getAgent('trading_bot');
    const riskAgent = this.system.getAgent('risk_manager');

    if (!tradingAgent || !riskAgent) {
      throw new Error('Required agents not found');
    }

    // First check risk
    const riskAnalysis = await riskAgent.executeSkill('analyze_risk', { symbol, quantity, action });

    if (!riskAnalysis.approved) {
      return {
        success: false,
        reason: 'Risk check failed: ' + riskAnalysis.reason
      };
    }

    // Execute trade if risk approved
    return tradingAgent.executeSkill('execute_order', { symbol, action, quantity });
  }

  /**
   * Get current portfolio status
   */
  public async getPortfolioStatus(): Promise<any> {
    const agent = this.system.getAgent('trading_bot');
    if (!agent) throw new Error('Trading agent not found');

    return agent.executeSkill('get_portfolio', {});
  }
}
