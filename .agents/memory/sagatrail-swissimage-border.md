---
name: Swissimage border coverage
description: Why panorama imagery can be sharp only on the Swiss side near national borders.
---

SwissTopo SWISSIMAGE detail follows Swiss national coverage. Near borders, the same panorama detail meshes can therefore look sharp toward Switzerland and visibly weaker across the border.

**Why:** A Basel device test showed sharp detail from roughly 90° through 270° and weak detail toward north. A forced magenta overlay proved the detail geometry existed over 360°; north points into Germany, outside equivalent SWISSIMAGE coverage.

**How to apply:** Before diagnosing directional texture loading, compare the observer and bearing with the national border. Do not treat lower foreign-side resolution as missing meshes, failed tile commits, or UV rotation.