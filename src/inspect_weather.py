from pathlib import Path
import pandas as pd

PROJECT_DIR = Path(__file__).resolve().parent.parent

weather_file = PROJECT_DIR / "data" / "weather.csv"

df = pd.read_csv(weather_file, skiprows=3, encoding="utf-8")

print(df.head())
print("\nColumns:")
print(df.columns.tolist())

print("\nShape:")
print(df.shape)