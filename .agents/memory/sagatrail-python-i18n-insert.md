---
name: Python i18n batch-insert double-comma
description: A Python script inserting i18n blocks after existing trailing-comma lines can silently produce },,  which crashes Babel/Metro but passes tsc.
---

## Rule
When a Python script inserts a string block **after** a line that already ends with `},`, the insert string must **not** start with a leading comma.

**Wrong pattern:**
```python
replacement = existing_line + ",\n" + new_block  # new_block already starts with ","
# Result: },\n,<newblock>  →  Babel sees },,
```

**Correct pattern:**
```python
new_block = "    conditionEmoji: {...},\n"  # no leading comma
replacement = existing_line + "\n" + new_block
```

**Why:** TypeScript (tsc) is lenient about trailing/extra commas in object literals; Babel/Metro is strict. A double-comma `},,` passes `tsc --noEmit` with EXIT:0 but crashes the Expo/Metro bundler with `SyntaxError: Unexpected token`.

## How to apply
After any Python batch-insert into a `.ts` i18n file:
1. Run `python3 -c "with open(f) as x: assert '},,', 'not found'"` or grep for `},,` to verify.
2. If found, remove the extra comma. One targeted `str.replace('},,', '},')` is enough.
3. Restart the Expo workflow to clear Metro's file cache.
