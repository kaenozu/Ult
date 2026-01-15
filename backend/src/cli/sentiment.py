#!/usr/bin/env python3
"""
Sentiment Analysis CLI
Allows the AI agent to analyze text sentiment or fetch and analyze news headlines for a ticker.
"""

import argparse
import json
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.sentiment_analyzer import SentimentAnalyzer

def main():
    parser = argparse.ArgumentParser(description="Sentiment Analysis CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Analyze Text Command
    text_parser = subparsers.add_parser("text", help="Analyze sentiment of a specific text")
    text_parser.add_argument("text", help="Text to analyze")

    # Analyze News Command
    news_parser = subparsers.add_parser("news", help="Analyze news headlines for a ticker")
    news_parser.add_argument("ticker", help="Stock ticker symbol (e.g., 7203.T)")
    news_parser.add_argument("--limit", type=int, default=10, help="Max articles to analyze")

    args = parser.parse_args()

    try:
        analyzer = SentimentAnalyzer()

        if args.command == "text":
            result = analyzer.analyze_text_sentiment(args.text)
            print(json.dumps(result, ensure_ascii=False, indent=2))

        elif args.command == "news":
            news_data = analyzer.analyze_news_headlines(args.ticker, max_articles=args.limit)
            indicators = analyzer.calculate_sentiment_indicators(news_data)
            
            output = {
                "ticker": args.ticker,
                "indicators": indicators,
                "headlines": news_data
            }
            print(json.dumps(output, ensure_ascii=False, indent=2))

        else:
            parser.print_help()

    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
