import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ULT Trading Platform API',
      version: '1.0.0',
      description: 'AI-powered trading analysis platform API for Japanese (Nikkei 225) and US markets (S&P 500, NASDAQ)',
      contact: {
        name: 'ULT Development Team',
        url: 'https://github.com/kaenozu/Ult',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://your-production-url.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
          required: ['error'],
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Validation error message',
            },
            field: {
              type: 'string',
              description: 'Field that failed validation',
            },
          },
          required: ['error', 'field'],
        },
        OHLCV: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format or YYYY-MM-DD HH:mm for intraday',
              example: '2026-01-28',
            },
            open: {
              type: 'number',
              description: 'Opening price',
              example: 38000,
            },
            high: {
              type: 'number',
              description: 'Highest price',
              example: 38500,
            },
            low: {
              type: 'number',
              description: 'Lowest price',
              example: 37800,
            },
            close: {
              type: 'number',
              description: 'Closing price',
              example: 38200,
            },
            volume: {
              type: 'number',
              description: 'Trading volume',
              example: 1500000,
            },
            isInterpolated: {
              type: 'boolean',
              description: 'Whether the data point is interpolated from previous close',
              example: false,
            },
          },
          required: ['date', 'open', 'high', 'low', 'close', 'volume'],
        },
        Quote: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol',
              example: '^N225',
            },
            price: {
              type: 'number',
              description: 'Current market price',
              example: 38200,
            },
            change: {
              type: 'number',
              description: 'Price change',
              example: 150,
            },
            changePercent: {
              type: 'number',
              description: 'Price change percentage',
              example: 0.39,
            },
            volume: {
              type: 'number',
              description: 'Trading volume',
              example: 1500000,
            },
            marketState: {
              type: 'string',
              description: 'Current market state',
              enum: ['REGULAR', 'CLOSED', 'PRE', 'POST'],
              example: 'REGULAR',
            },
          },
          required: ['symbol', 'price'],
        },
        Signal: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol',
              example: '7203',
            },
            type: {
              type: 'string',
              enum: ['BUY', 'SELL', 'HOLD'],
              description: 'Signal type',
              example: 'BUY',
            },
            confidence: {
              type: 'number',
              description: 'Signal confidence (0-1)',
              example: 0.85,
            },
            targetPrice: {
              type: 'number',
              description: 'Target price',
              example: 2500,
            },
            stopLoss: {
              type: 'number',
              description: 'Stop loss price',
              example: 2200,
            },
            reason: {
              type: 'string',
              description: 'Signal reasoning',
              example: 'Strong bullish momentum with RSI divergence',
            },
            predictedChange: {
              type: 'number',
              description: 'Predicted price change percentage',
              example: 5.2,
            },
            predictionDate: {
              type: 'string',
              format: 'date-time',
              description: 'Prediction timestamp',
              example: '2026-01-28T12:00:00Z',
            },
          },
          required: ['symbol', 'type', 'confidence', 'targetPrice', 'stopLoss', 'reason'],
        },
        Position: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol',
              example: '7203',
            },
            name: {
              type: 'string',
              description: 'Stock name',
              example: 'Toyota Motor Corp',
            },
            market: {
              type: 'string',
              enum: ['japan', 'usa'],
              description: 'Market',
              example: 'japan',
            },
            side: {
              type: 'string',
              enum: ['LONG', 'SHORT'],
              description: 'Position side',
              example: 'LONG',
            },
            quantity: {
              type: 'number',
              description: 'Position quantity',
              example: 100,
            },
            avgPrice: {
              type: 'number',
              description: 'Average entry price',
              example: 2300,
            },
            currentPrice: {
              type: 'number',
              description: 'Current price',
              example: 2450,
            },
            change: {
              type: 'number',
              description: 'Price change percentage',
              example: 6.52,
            },
            entryDate: {
              type: 'string',
              format: 'date-time',
              description: 'Entry date',
              example: '2026-01-15T10:00:00Z',
            },
          },
          required: ['symbol', 'name', 'market', 'side', 'quantity', 'avgPrice', 'currentPrice', 'change', 'entryDate'],
        },
        Portfolio: {
          type: 'object',
          properties: {
            positions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Position',
              },
            },
            orders: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            totalValue: {
              type: 'number',
              description: 'Total portfolio value',
              example: 1500000,
            },
            totalProfit: {
              type: 'number',
              description: 'Total profit/loss',
              example: 50000,
            },
            dailyPnL: {
              type: 'number',
              description: 'Daily profit/loss',
              example: 2500,
            },
            cash: {
              type: 'number',
              description: 'Available cash',
              example: 500000,
            },
          },
          required: ['positions', 'orders', 'totalValue', 'totalProfit', 'dailyPnL', 'cash'],
        },
        TradingStatus: {
          type: 'object',
          properties: {
            isRunning: {
              type: 'boolean',
              description: 'Whether the platform is running',
              example: true,
            },
            lastUpdate: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        RiskMetrics: {
          type: 'object',
          properties: {
            maxDrawdown: {
              type: 'number',
              description: 'Maximum drawdown percentage',
              example: 5.2,
            },
            sharpeRatio: {
              type: 'number',
              description: 'Sharpe ratio',
              example: 1.8,
            },
            volatility: {
              type: 'number',
              description: 'Portfolio volatility',
              example: 12.5,
            },
          },
        },
        Alert: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Alert ID',
            },
            name: {
              type: 'string',
              description: 'Alert name',
            },
            symbol: {
              type: 'string',
              description: 'Stock symbol',
            },
            type: {
              type: 'string',
              description: 'Alert type',
            },
            operator: {
              type: 'string',
              description: 'Comparison operator',
              enum: ['>', '<', '>=', '<=', '=='],
            },
            value: {
              type: 'number',
              description: 'Threshold value',
            },
            triggered: {
              type: 'boolean',
              description: 'Whether alert has been triggered',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Alert timestamp',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Market Data',
        description: 'Market data endpoints for fetching stock prices, quotes, and historical data',
      },
      {
        name: 'Trading',
        description: 'Trading platform control and execution endpoints',
      },
    ],
  },
  apis: ['./app/api/**/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
