import yfinance as yf
print("Attempting to download AAPL...")
data = yf.download("AAPL", period="1d")
print("Data shape:", data.shape)
print(data)
