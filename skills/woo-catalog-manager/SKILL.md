---
name: woo-catalog-manager
description: Review WooCommerce products, categories, variations, pricing and inventory safely with preview-first edits.
---

# WooCommerce Product and Catalog Manager
Trigger: products, variants, SKU, stock levels, sale prices, featured items, category, product SEO.
1. Confirm authorized store; discover REST v3/MCP scope. Prefer read-only credential to review. Do not assume Store API exposes private orders.
2. Inspect only requested IDs/SKUs and paginate deliberately. Identify simple vs variable items and per-variation inventory.
3. Build proposed diff table (`id/SKU`, existing value, proposed value, rationale, impact); validate duplicates, taxes, currency, sale dates, visibility, attributes and SEO metadata.
4. If batch operation: limit scope, save pre-change snapshot, ask for approval; no mass repricing or stock changes without approval.
5. After changes, re-read affected records, check rendered storefront and variation selection where available. Report errors and rollback record.
6. For inventory *analysis*, use actual current stock and observed sales. Do not invent historical stock states, supplier lead times or reorder forecasts.
