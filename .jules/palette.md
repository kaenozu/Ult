## 2026-03-25 - Accessible Icon-Only Buttons in Dashboards
**Learning:** In complex, customizable interfaces like dashboards, many controls (like delete, visibility toggles, or close buttons) are purely visual icons. This makes them entirely inaccessible to screen readers without explicit ARIA labels. Furthermore, modals need proper dialog roles and labeled-by associations to trap focus conceptually and announce their purpose.
**Action:** Always add explicit aria-labels to icon-only buttons, especially in dynamic, configurable layouts where context changes rapidly.
