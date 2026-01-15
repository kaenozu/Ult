def format_currency_jp(amount: float) -> str:
    """日本円を万円形式で表示"""
    if amount is None:
        return "¥0"
    if amount >= 100000000:
        return f"¥{amount / 100000000:.2f}億"
    elif amount >= 10000:
        return f"¥{amount / 10000:.1f}万"
    else:
        return f"¥{amount:,.0f}"
