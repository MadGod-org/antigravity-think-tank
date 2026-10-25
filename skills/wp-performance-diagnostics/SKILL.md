---
name: wp-performance-diagnostics
description: "عیب‌یابی کارایی وردپرس و فروشگاه بدون حدس"
---

# WP Performance Diagnostics
Trigger: slow site, TTFB, Woo checkout latency, Core Web Vitals, database query, cron/caching.

1. Capture reproducible baseline and timeframe. Separate real-user CrUX/Field data from Lighthouse lab data. Consider logged-in vs logged-out, checkout/cart vs cacheable pages.
2. Inspect read-only measurements: server timing, response times, logs, PHP/WP versions, object cache, cron backlog, slow queries, autoloaded options. Use WP-CLI `wp doctor` / `wp profile` only if installed and allowed.
3. Identify likely bottleneck with evidence. Rank remedies by risk: images/fonts -> plugin conflicts and asset loading -> caching exclusions -> database queries -> infrastructure.
4. WooCommerce carts, checkout and account pages must not be accidentally cached as personalized content. Don't clear production caches, disable plugins, change PHP config or run expensive profiling without approval.
5. Propose one controlled change at a time, staging first when possible; re-measure same URL/devices/conditions, report delta and confidence. Reference official WP `wp-performance` and Woo `woocommerce-performance` skills.
