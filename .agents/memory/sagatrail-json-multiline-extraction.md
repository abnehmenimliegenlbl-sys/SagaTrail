---
name: Balanced brace JSON extraction from TS files
description: How to correctly extract embedded JSON values from TypeScript files when values may span multiple lines.
---

**Rule:** Never use `re.search(r'\{.+\}', line)` to extract JSON from TS files — it only captures a single line. Some embedded JSON values in curatedSagasPakete.ts span multiple lines (confirmed: 4 Genf/Walensee/Glarus sagas had multi-line summaries). Use balanced brace tracking instead.

**Why:** The regex stops at the last `}` on the first line, producing a valid but truncated JSON substring. `json.loads()` succeeds on the partial JSON (containing only "de" and "gsw" keys), causing silent data loss when writing back: all other language keys (en, fr, it, es, pt, zh, ru) get erased.

**How to apply:**
```python
def extract_balanced_json(text, start):
    depth = 0; in_string = False; escape_next = False; i = start
    while i < len(text):
        c = text[i]
        if escape_next: escape_next = False
        elif c == '\\' and in_string: escape_next = True
        elif c == '"' and not escape_next: in_string = not in_string
        elif not in_string:
            if c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0: return text[start:i+1]
        i += 1
    return None
# Usage:
sum_label_pos = content.find('"summaries":', block_start)
json_start = content.index('{', sum_label_pos + 12)
full_json = extract_balanced_json(content, json_start)
```
Always use this when reading/writing the `summaries` field in curatedSagasPakete.ts.
