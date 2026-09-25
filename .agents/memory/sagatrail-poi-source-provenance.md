---
name: POI source provenance
description: Evidence and attribution rules for reusable hiking-POI enrichment.
---

POI narratives must be based on text from an identifiable, object-appropriate source. AI may restyle sourced text but is not itself evidence. Wikimedia Commons file descriptions and metadata may support image selection and image credit, but must never be presented as POI facts. Show source links and available attribution beside the resulting text; keep source identity separate from the OSM source of the map feature. Firecrawl's `onlyMainContent` can still include newsletter/navigation copy or nearby-place snippets, so web extracts also need boilerplate removal and paragraph-level evidence that the named POI is the subject. If none remains, return no web narrative.

**Why:** Names, nearby files, and general model knowledge can refer to a different place or introduce unsupported claims. Real scraped pages may mix POI metadata with unrelated map content, even when main-content extraction is requested. Showing the source lets hikers distinguish sourced details from map provenance.

**How to apply:** For every reusable source adapter, require an object/location match, retain the source URL and license/creator metadata when available, screen each web paragraph for direct POI relevance, and return no narrative fact when evidence is absent.