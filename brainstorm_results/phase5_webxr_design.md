# Phase 5: WebXR Technical Design ("The Void Terminal")

## 📅 Session Summary
- **Topic:** WebXR Spatial Trading Interface.
- **Goal:** Define the UX/UI and Tech Stack for the "Singularity" interface.
- **Participants:** Big Pickle (Vision), GLM (Data), MiniMax (Safety), Qwen (Perf).

---

## 🏛️ The Debate

### 1. Visual Metaphor
*   **Pickle:** "Minority Report". Floating windows, gesture controls.
*   **GLM:** "Data Galaxy". 3D Visualization of high-dimensional data (Correlations).
*   **Verdict:** **"Hybrid Void"**.
    *   Background: Infinite dark grid (Cyberpunk/Tron).
    *   Center: "Holo-Desk" for active trades (Pickle).
    *   Surroundings: "Market Galaxy" - 500+ stocks positioned by ML similarity (GLM).

### 2. Interaction Model
*   **Pickle:** Full hand tracking. Grabbing objects.
*   **MiniMax:** "Gorilla Arm Syndrome" is real. Users will get tired in 5 minutes.
*   **Verdict:** **"Gaze & Raycast"**.
    *   Primary: Look at object + Click (Controller/Hand Pinch).
    *   Avoid large arm movements. Keep UI close to "Rest Position".

### 3. Tech Stack
*   **Qwen:** Use **React Three Fiber (R3F)**.
    *   Integration with existing React state (`zustand`) is trivial.
    *   Performance is near-native if using `InstancedMesh`.

---

## 🛠️ Implementation Plan

### Stack
-   **Core:** `react-three-fiber`, `@react-three/drei`, `@react-three/xr`.
-   **State:** `zustand` (Shared with 2D DOM).
-   **Physics:** `use-cannon` (Optional, for satisfying UI clicks).

### Components
1.  **`<VoidScene />`**: The main canvas. Setup XR controllers.
2.  **`<MarketGalaxy />`**: InstancedMesh of 500 particles (Tickers).
    -   Color: Red/Green (PnL).
    -   Position: Dimensionality Reduction (Sector/Correlation).
3.  **`<HoloDeck />`**: 2D UI projected in 3D space (`Html` from `drei`) for charts/order entry.

### Safety (MiniMax)
-   **Motion Sickness:** No artificial locomotion. User is stationary. World moves around them *only* on deliberate teleport.
-   **Frame Rate:** Dynamic resolution scaling to maintain 90fps.

---

## 🚀 Next Steps
1.  `npm install three @types/three @react-three/fiber @react-three/drei @react-three/xr`
2.  Create `src/components/xr/VoidScene.tsx`.
3.  Render a Mock Galaxy.
