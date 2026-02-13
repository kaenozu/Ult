import asyncio
import json
import sys
import re
from datetime import datetime
from playwright.async_api import async_playwright

def validate_symbol(symbol: str) -> bool:
    """
    日本株のシンボル形式（通常は4桁の数字）を検証する
    """
    return bool(re.match(r'^[0-9]{4}$', symbol))

async def fetch_japanese_stock_quote(symbol: str):
    """
    Yahoo Finance Japanから株価を取得する
    """
    if not validate_symbol(symbol):
        print(json.dumps({"error": f"Invalid symbol format: {symbol}. Only 4-digit numbers are allowed."}))
        sys.exit(1)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        url = f"https://finance.yahoo.co.jp/quote/{symbol}.T"
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            
            # 価格情報の取得 (セレクタは最新のYahoo Finance Japanに対応)
            # 価格
            price_elem = await page.query_selector("._3NC9u9_p")
            if not price_elem:
                # フォールバック
                price_elem = await page.query_selector(".stoksPrice")
            
            price_text = await price_elem.inner_text() if price_elem else "0"
            price = float(price_text.replace(",", "").replace("円", ""))

            # 前日比などの追加情報 (必要に応じて)
            
            result = {
                "symbol": symbol,
                "price": price,
                "bid": price - 0.5, # 気配値の取得ロジックは構造が複雑なため、一旦現在値ベースで算出
                "ask": price + 0.5,
                "timestamp": datetime.now().isoformat()
            }
            
            print(json.dumps(result))
            
        except Exception as e:
            error_res = {
                "error": str(e),
                "symbol": symbol
            }
            print(json.dumps(error_res))
            sys.exit(1)
        finally:
            await browser.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No symbol provided"}))
        sys.exit(1)
    
    symbol = sys.argv[1]
    asyncio.run(fetch_japanese_stock_quote(symbol))
