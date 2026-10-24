from pathlib import Path
import geopandas as gpd

# Get the project root
PROJECT_DIR = Path(__file__).resolve().parent.parent

# Build the path to the GeoJSON
data_file = PROJECT_DIR / "data" / "Daraga_Roads.geojson"

print("Loading:", data_file)

gdf = gpd.read_file(data_file)

print("Loaded successfully!")
print("Number of features:", len(gdf))
print(gdf.head())