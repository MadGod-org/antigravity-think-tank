---
name: wp-seo-auditor
description: "ممیزی فنی سئو، اسکیما و ایندکسینگ مبتنی بر شواهد"
---

# WordPress SEO Auditor
Trigger: SEO audit, indexation, redirect, robots, sitemap, canonical, structured data, rankings, page titles, metadata, Core Web Vitals.

1. First establish domain, target URL(s), search intent and scope. Determine SEO plugin (Yoast/Rank Math/AIOSEO/other), canonical configuration, sitemap and WP settings. Gather actual evidence from crawl/browser/Search Console if available; label unchecked assertions.
2. Diagnose in order: accessibility/indexability -> redirect/canonical -> HTTP status/sitemap/robots -> internal linking -> metadata/content -> structured data -> performance.
3. Never infer missing JSON-LD from text-only scrape alone: use a rendered browser or Rich Results Test for JS-injected schema. Detect plugin-generated schema before proposing new JSON-LD to avoid duplicates.
4. Suggest prioritized fixes: issue, impacted URLs, observed evidence, confidence, impact, effort, recommended action and verification method.
5. Don't edit sitemap/robots/canonicals/schema or publish SEO pages without site approval. No ranking promises, link spam, mass thin pages or made-up Search Console metrics.
6. Compare against Google Search Central rules. For advanced auditing optionally consult `coreyhaines31/marketingskills` → `seo-audit`, `schema`, `site-architecture`, `ai-seo` or `programmatic-seo` as appropriate (never all at once).
