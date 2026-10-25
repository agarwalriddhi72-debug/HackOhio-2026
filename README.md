# ROUTEY — Daraga Evacuation & Disaster Response Navigator

**ROUTEY** is an AI-assisted evacuation planning and disaster hazard early warning system designed specifically for **Daraga, Albay, Philippines** (HackOHI/O 2026). It prioritizes **older adults and people with disabilities (PWDs)** during flooding, Mayon volcanic lahar flows, typhoons, and landslides by recommending accessible transportation, optimizing evacuation routes, and balancing shelter capacity.

---

## Three Live Synchronized Interfaces

1. **Rider Interface (Elderly & PWDs)**:
   - High-contrast, large-button interface designed for older adults and individuals with visual, physical, or mobility impairments.
   - Allows riders to submit evacuation requests with special accessibility requirements (Wheelchair with ramp/lift, Stretcher/Bed-bound, Walking assistance, Infant/Mother).
   - Real-time location snapping to Daraga's 28,465-node road graph.
   - Accessible live status tracking:
     - `WAITING FOR DISPATCH`: Queued in system with dynamic priority score calculation.
     - `VEHICLE EN ROUTE`: Assigned accessible vehicle, driver details, and ETA.
     - `BUS IS FULL, PLEASE WAIT FOR THE NEXT BUS`: When a driver marks the vehicle full, unserved riders are automatically kept in the prioritized pool and receive this status notification.
     - `SAFELY ON BOARD`: Live status en route to safe shelter.
     - `SAFELY EVACUATED`: Registered at designated evacuation center.
   - Text-to-Speech voice assist button to read status aloud for visually impaired riders.

2. **Driver Interface**:
   - Turn-by-turn Dijkstra shortest-path route connecting pickup points to the designated evacuation shelter.
   - Vehicle telemetry: Seat availability, wheelchair space occupancy, stretcher capacity.
   - **"Bus full" button**: Marks vehicle full, frees the vehicle to head directly to shelter drop-off, and immediately moves all unserved riders back into the waiting pool with notifications to wait for the next bus.
   - Route advancement actions: "Confirm Picked Up" and "Complete Shelter Drop-Off".

3. **Shelter Interface**:
   - 162 Daraga evacuation center candidates (Tier 1 schools & covered courts; Tier 2 town halls & churches).
   - Real-time capacity and occupancy tracking.
   - **"Shelter full" button**: Instantly removes the shelter from available drop-offs and automatically reroutes active drivers to the nearest shelter with capacity.
   - Accessibility restriction toggle: Allows shelters to declare whether they can accommodate wheelchairs (e.g. if ramps are flooded or filled).

---

## Disaster Early Warning System (Weather Module)

- Built upon 50 years of hourly historical weather data for Daraga, Albay (`PastWeather.csv`) and the Random Forest classification models from `future1.py` and `testCases.py`.
- Evaluates four disaster hazards calibrated to official **PAGASA** and **PHIVOLCS** thresholds:
  1. **Cyclone / Typhoon**: Signal #1-2 wind gusts (>=39 km/h), barometric pressure drop (<=1005 hPa), 3-hour sustained window.
  2. **Flash Flood**: Rainfall rate (>=7.5 mm/h), 3-hour accumulated rainfall (>=45-65 mm), 2-hour sustained window.
  3. **Mayon Volcanic Lahar**: PHIVOLCS rainfall threshold (>=10 mm/h) + high soil moisture (>=0.40 m³/m³), 1-hour sustained window.
  4. **Rain-Induced Landslide**: Soil saturation + 3-hour rainfall infiltration, 3-hour sustained window.
- **Historical Risk Indicator Disclaimer**: Clearly labeled as a historical risk indicator to remind responders to always defer to official PAGASA / PHIVOLCS advisories.
- **Replay / Demo Mode**: Pre-configured test dates directly from `testCases.py`:
  - `2026-12-22 23:00` (Typhoon Warning Signal #2)
  - `2026-11-14 14:00` (PAGASA Red Flash Flood Warning)
  - `2026-12-05 18:00` (PHIVOLCS Mayon Lahar Advisory)
  - `2026-10-25 08:00` (Fair Weather / All Clear)

---

## Routing & Spatial Datasets (`data/daraga/`)

- `graph_nodes.csv`: 28,465 vertices across Daraga and connecting buffer areas.
- `graph_edges.csv`: 29,504 directed segments with travel times and bridge crossings.
- `shelter_candidates.geojson`: 162 potential evacuation centers.
- `medical_facilities.geojson`: 41 hospitals, health posts, and clinics.
- `transport_hubs.geojson`: 5 bus terminals / vehicle depots.
- `clipping_boundary.geojson`: Daraga municipal boundary buffer.
- `roads_drivable.geojson`: 3,539 drivable road segments for mapping.
