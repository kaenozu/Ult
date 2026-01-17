# Phase 5.1 Design: "The Market Galaxy"

## 🌌 Concept
Transform the "Void Terminal" from a demo sphere into a functioning **3D Data Visualization** of the market.
Instead of a simple list, stocks are "stars" floating in the void.

## 📐 Technical Architecture
1.  **Rendering Check:**
    -   Target: 500-1000 tickers.
    -   Method: **`InstancedMesh`** (Crucial for 90fps). Do NOT render 500 `Mesh` objects.
    -   Library: `react-three-fiber` + `@react-three/drei`.

2.  **Data Mapping (XYZ):**
    -   **X:** Sector (Technology = Left, Finance = Right).
    -   **Y:** Market Cap (Large = Top, Small = Bottom).
    -   **Z:** Beta/Volatility (Stable = Near, Volatile = Far).
    -   *Note:* Initially use mock randomization clustered by sector.

3.  **Visual Encoding:**
    -   **Color:** Daily Change % (Bright Green to Bright Red).
    -   **Size:** Trading Volume.

4.  **Interaction (Raycasting):**
    -   **Hover:** Highlight star (BoxHelper or Emissive glow). Show tooltip.
    -   **Click:** Open "Holo-Card" (2D HTML Overlay via `drei/Html`) showing the chart.

## 🛠️ Implementation Steps
1.  **`useMarketGalaxyData` Hook:** Generate mock 3D coordinates for 500 tickers.
2.  **`GalaxyStars` Component:** Renders the `InstancedMesh`.
3.  **Holo-UI:** Integration of 2D React components inside the 3D scene.

## ⚠️ Safety (MiniMax)
-   **Field of View:** Keep all interactive elements within 60 degrees of center to prevent neck strain.
-   **Motion:** No camera flying. Rotate the *universe* instead of the *user*.
