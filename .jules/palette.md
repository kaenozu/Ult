## 2024-05-22 - Form Accessibility in Trading Panels
**Learning:** Trading interfaces often neglect form accessibility in favor of density. Adding explicit `htmlFor` labels and `aria-label` to inputs like "Quantity" and "Price" is critical because screen reader users need to know exactly what they are trading and at what price, especially when financial risk is involved.
**Action:** Always check that high-stakes input fields (money, quantity) have explicit programmatic labels, even if the visual design implies the relationship.
