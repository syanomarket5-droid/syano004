---
name: No position:fixed on mobile action bars
description: Why mobile sticky bars (position:fixed) were replaced with inline elements in the shopping flow.
---

# Avoid position:fixed for mobile action bars in this project

## The rule
Do NOT use `position: fixed` for action bars (Add to Cart, Checkout, Continue, etc.) in the marketplace shopping flow. Use inline document-flow elements instead.

**Why:** `position: fixed` does not render correctly in this app's mobile context — elements end up invisible or appear at the bottom of the page document instead of being pinned to the viewport. Root cause was not fully isolated (likely an interaction between the flex Layout wrapper, the preview iframe environment, or mobile WebKit behavior), but the symptom is consistent.

**How to apply:**
- Product detail page: show the Qty + action buttons box inline in the info column (no `hidden md:block`). The 2-col grid already collapses to 1 col on mobile so it appears below the image naturally.
- Cart page: add a `lg:hidden` mobile summary card inside the `flex-col lg:flex-row` container after the items div; keep the `hidden lg:block` desktop summary unchanged.
- Checkout page: show navigation buttons (Back/Continue/Place Order) with plain `flex`, not `hidden lg:flex`.
- Never add a `fixed bottom-0` bar as the ONLY way to access a primary action on mobile.
