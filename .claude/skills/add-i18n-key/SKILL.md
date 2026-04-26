---
name: add-i18n-key
description: Add, update, audit, or normalize i18n translation keys in EduTrace. Use this skill whenever the user wants to add new UI text, add translation keys, add localization entries, scaffold a module's i18n namespace, audit missing translations, sync locale files, rename or reorganize keys, or normalize the i18n structure across locale files and Vue templates. Always invoke this skill rather than editing locale files manually — both en-US.json and uk-UA.json must always be updated together.
---

# add-i18n-key

Manages translation keys in `src/locales/en-US.json` and `src/locales/uk-UA.json`.

**Rule**: every key must exist in both files. Never add to one without the other.

## Modes

### 1. Add a single key or small set of keys

Ask the user for:
- The **dot-notation path** (e.g. `equipment.table.name`) — or infer it from context
- The **English value**
- The **Ukrainian value** — if they don't know it, translate it yourself based on the existing Ukrainian tone in the file (formal, noun-first)

Then insert using the Edit tool. Find the correct nesting position in each file and insert the key maintaining alphabetical order within its sibling group where possible.

### 2. Scaffold a new module namespace

When a new module is being added (e.g. via `scaffold-module`), generate a full i18n namespace block for it in both files at once.

Ask for:
- Module name (camelCase, e.g. `equipment`)
- Entity label (singular + plural), e.g. "Equipment" / "Equipments"

Generate this shape (adapt to the entity):

**en-US.json** entry:
```json
"<module>": {
  "title": "<Entity> List",
  "add": "Add <Entity>",
  "saved": "<Entity> saved",
  "deleted": "<Entity> deleted",
  "searchPlaceholder": "Search by name...",
  "noItems": "No <entities> found",
  "noMatch": "No results for your search",
  "table": {
    "name": "Name",
    "actions": "Actions"
  },
  "deleteModal": {
    "title": "Delete <Entity>",
    "message": "This action cannot be undone.",
    "confirm": "Delete"
  }
}
```

**uk-UA.json** entry — translate the values, keep the same key structure.

### 3. Audit — find keys missing from one locale

When the user asks to audit or check for missing keys, run this script inline with Bash:

```bash
node -e "
const en = require('./src/locales/en-US.json');
const uk = require('./src/locales/uk-UA.json');

function flatKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? \`\${prefix}.\${k}\` : k;
    return typeof v === 'object' && v !== null ? flatKeys(v, path) : [path];
  });
}

const enKeys = new Set(flatKeys(en));
const ukKeys = new Set(flatKeys(uk));

const missingInUk = [...enKeys].filter(k => !ukKeys.has(k));
const missingInEn = [...ukKeys].filter(k => !enKeys.has(k));

if (missingInUk.length) console.log('Missing in uk-UA:\\n' + missingInUk.join('\\n'));
if (missingInEn.length) console.log('Missing in en-US:\\n' + missingInEn.join('\\n'));
if (!missingInUk.length && !missingInEn.length) console.log('All keys in sync.');
"
```

After the audit, offer to fix any missing keys.

### 4. Normalize — rename/reorganize keys and update all usages

This is a refactoring operation: rename or restructure keys in both locale files **and** update every reference across Vue templates and TypeScript files. Only run this on explicit user request.

#### Step 1 — Build the full picture

Before proposing anything, gather facts:

```bash
# All literal key usages in source (Vue + TS)
grep -rh "\$t('[^']*')\|[^a-z]t('[^']*')" src --include="*.vue" --include="*.ts" -o \
  | grep -oP "(?<=')[^']+(?=')" | sort -u > /tmp/edutrace_used_keys.txt

# All defined keys (flat)
node -e "
const en = require('./src/locales/en-US.json');
function flat(o, p='') {
  return Object.entries(o).flatMap(([k,v]) => {
    const path = p ? p+'.'+k : k;
    return typeof v==='object' ? flat(v,path) : [path];
  });
}
flat(en).forEach(k => console.log(k));
" | sort > /tmp/edutrace_defined_keys.txt

# Dynamic key patterns (template literals — need manual review)
grep -rn 't(`' src --include="*.vue" --include="*.ts"
```

Report to the user:
- Keys defined but never used in source (dead keys)
- Keys used in source but not defined (will throw at runtime)
- Dynamic keys found (list them — they need manual review before renaming)

#### Step 2 — Propose a normalization plan

Based on what you find, propose concrete changes in a table. Common issues to look for:
- Keys that belong to a module but sit at the wrong nesting level
- Inconsistent naming patterns (e.g. `deleteModal.title` in some places, `delete.title` in others)
- Duplicate values with different keys
- Keys whose names don't reflect their current usage

Present the plan as:

| Old key | New key | Reason |
|---|---|---|
| `confirm.cancel` | `common.cancel` | Duplicate of existing `common.cancel` |
| `marks.filter.group` | `marks.filter.groupName` | Matches field name used in code |

**Always wait for user approval before making any changes.**

#### Step 3 — Execute the rename

For each approved rename, do all three edits atomically per key:

1. **Locale files** — update the key name/location in both `en-US.json` and `uk-UA.json`
2. **Vue templates** — replace `$t('old.key')` → `$t('new.key')` across all `.vue` files
3. **TypeScript files** — replace `t('old.key')` → `t('new.key')` across all `.ts` files

Use Grep to find every occurrence before editing, so nothing is missed. For each file that needs changes, use Edit (not Write).

After all renames, verify:
```bash
# JSON still valid
node -e "require('./src/locales/en-US.json'); require('./src/locales/uk-UA.json'); console.log('JSON OK')"

# No old keys remain in source
grep -rn "OLD_KEY_HERE" src --include="*.vue" --include="*.ts"
```

#### Caution: dynamic keys

If a key appears in a template literal (e.g. `` $t(`analytics.sections.${section.key}`) ``), renaming the key prefix will silently break it at runtime. Always flag these to the user and exclude them from automated renames unless the user explicitly handles them.

## Editing rules

- The locale files are large (~1800 lines each). Always read only the section you need before editing — use `grep` to locate the line number of the target key's parent object, then Read with `offset`/`limit`.
- Insert keys using the Edit tool, not Write (never rewrite the whole file).
- Preserve the existing indentation style: 2 spaces.
- Keep the JSON valid — no trailing commas.
- After inserting, verify the JSON parses cleanly:
  ```bash
  node -e "require('./src/locales/en-US.json'); require('./src/locales/uk-UA.json'); console.log('OK')"
  ```
