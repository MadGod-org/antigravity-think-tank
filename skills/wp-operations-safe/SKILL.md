---
name: wp-operations-safe
description: Analyze WordPress WP-CLI site operations, backups, upgrades and cron with staging-first changes.
---

# Safe WordPress Operations
Trigger: site inventories, plugin/theme/core versions, WP-CLI, backup, migration, scheduled tasks, cache.
1. Detect WP version, environment, role, multisite, relevant hosting constraints and CLI permissions.
2. Favor upstream `wp-wpcli-and-ops`. Start with diagnostics (`wp core version`, `wp plugin list`, `wp theme list`, `wp cron event list`) only when site access exists.
3. Record a verified database + files backup and restore procedure *before* updates, mass replacements or migrations. Be aware `wp db export` is database-only, not a full-site backup.
4. Make staging clone for changing plugins/themes; compare PHP, WordPress and WooCommerce compatibility.
5. Prepare exact commands as a plan; never run production updates, `wp search-replace`, `wp db import`, deletes or role changes without user approval.
6. Verify checkout, login, admin, cron, redirects and logs after authorized change; provide rollback.
