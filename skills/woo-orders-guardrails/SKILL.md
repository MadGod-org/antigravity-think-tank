---
name: woo-orders-guardrails
description: "گزارش سفارش و مراقبت از تراکنش‌ها بدون تغییر ناخواسته"
---

# WooCommerce Orders Guardrails
Trigger: order reports, checkout troubleshooting, refunds, fulfillment, taxes, payments, shipping, subscriptions.

Default: **READ ONLY**. Request only aggregate order counts, statuses and dates for reporting. Avoid customer PII unless necessary and authorized; redact email, names, addresses, payment detail and order notes before sending to language-model context.

For a single order: identify order ID and authorization; inspect minimal necessary fields, payment/order status and logs without saving sensitive values. Diagnose with staging or test payments, never place an actual charge as a test.

Any action that updates order state, creates shipment, sends customer email, touches a payment, initiates a refund, changes shipping/tax settings or deletes order data requires explicit, specific approval and a documented change plan. No autonomous mass edits. Respect HPOS storage and WooCommerce CRUD APIs; don't assume orders are ordinary WordPress posts or modify database rows directly.

Verify authorized operations by re-reading affected objects and reconcile against payment gateway where applicable. Escalate ambiguous payment/tax/refund issues to store owner / qualified professional.
