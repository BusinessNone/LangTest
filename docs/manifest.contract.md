# Opportunity portal. Manifest contract

`public/manifest.json` is the single source of truth for the whole portal. The landing page, all
opportunity briefs and the data-asks page read it at runtime. Prompt 1 produces it. Prompt 2
consumes it and builds nothing that is not in it.

Derived from two shipped portals, one of 21 opportunities and one of 15.

---

## Top level

```jsonc
{
  "client":   { ... },   // required, framing, readiness, sequence
  "calls":    { ... },   // required, build-type taxonomy
  "groups":   { ... },   // required when opportunities have differing provenance
  "sampleSources": { ... }, // required, data-readiness taxonomy
  "ideas":    [ ... ],   // required, the opportunities
  "operatingRegions": [ ... ],      // optional, multi-region clients only
  "operatingRegionModel": { ... },  // optional, pairs with operatingRegions
  "regionNote": "..."               // optional, the unreconciled-region qualifier
}
```

## client

| Field | Req | Notes |
|---|---|---|
| `slug` | yes | lowercase, used as the Cloudflare Worker name and subdomain |
| `name` | yes | legal or full client name |
| `short` | yes | what the client calls itself |
| `subtitle` | yes | e.g. "Global insight & AI opportunities" |
| `author` | yes | RSM authors, comma separated |
| `practice` | yes | e.g. "RSM One Microsoft Practice" |
| `basis` | yes | "Prepared by RSM for {name}" |
| `team` | yes | e.g. "AI opportunity portfolio" |
| `source` | yes | one sentence naming every corpus artifact and its size, plus call dates. This is the provenance line the client will check. |
| `lede` | yes | 2 to 4 sentences. The reframe, in the client's own language, ending with what the portal contains. |
| `setup[]` | yes | 3 to 5 `{label, body}`. The framing the reader needs before the cards make sense. |
| `sequence` | yes | one paragraph of prose: what ships first and why, ending in the tail order |
| `readiness[]` | opt | `{label, value, tone}` where tone is `low` \| `mid` \| `high`. Omit entirely if no assessment was run. Never invent scores. |
| `theme` | opt | the one word or phrase that resonated on the call |
| `sponsor` | opt | named client sponsor, only if the portal will not be shared broadly |
| `presold[]` | opt | work already sold, so the portal does not re-pitch it |
| `timing` | opt | one sentence on the decision window |
| `namedAsks[]` | opt | `{label, ref, body}`. The two or three extracts that gate the build, called out above the full list on the data-asks page. `ref` must match an `ideas[].ref`; an unresolvable ref is skipped. Omit entirely and the callout section is empty. |

## calls. Build-type taxonomy

Keyed object. Each value `{label, ink, note}`. `ink` drives the colour strip and is named by role,
never by colour.

| Key | ink | Meaning |
|---|---|---|
| `d365` | `core` | configuration or extension inside D365 itself |
| `power` | `platform` | Copilot Studio, Power Apps, Power Automate, Power Pages on D365 data |
| `azure` | `azure` | Azure AI service beside D365, consuming or feeding it |
| `buy` | `buy` | already out of the box, do not custom-build |
| `configure` | `config` | ships as configuration, not a build |

Add or drop keys per engagement (a prototype-led pursuit may want a `prototype` key). Do not use colour literals as `ink` values.

## groups. Provenance taxonomy

Keyed object, each `{label, blurb}`. This is the honesty layer, so use the sharpest labels the
evidence supports.

| Key | Label |
|---|---|
| `A` | Stated ask, the client asked for these in writing |
| `B` | Not a stated ask, RSM-recommended, qualifier travels with every one |
| `C` | Buy or configure, do not build |
| `D` | From the discovery call, raised verbally, not in the written requirements |

## sampleSources. Data readiness

Keyed object, each `{label, note}`.

| Key | Label | Meaning |
|---|---|---|
| `ask_client` | Sample data needed | real files or extracts required to build credibly |
| `mockable` | Demo data ready | a convincing demo set can be stood up now |
| `reuse` | Shares data | uses the same data as another opportunity |

## ideas[]

| Field | Type | Notes |
|---|---|---|
| `id` | int | 1-based, display order |
| `ref` | string | group letter + ordinal, e.g. `A1`, `B7`, `D1`. The ID the client quotes back. |
| `slug` | string | kebab-case, becomes `/i/{slug}` and `/m/{slug}` |
| `title` | string | the opportunity name |
| `tagline` | string | 3 to 6 words, e.g. "What leadership asked for" |
| `call` | string | key into `calls` |
| `group` | string | key into `groups` |
| `wave` | int | 0-based build wave |
| `waveLabel` | string | e.g. `Wave 0 · lead with this` (uses `·`, never an em dash) |
| `shortlist` | bool | renders the "Where we'd start" badge |
| `flagship` | bool | renders the "Flagship" badge. At most one or two per portal. |
| `mockup` | string \| null | slug of the demo under `/m/`. Usually equals `slug`. |
| `mockup2` | string | optional second demo slug |
| `mockup2Label` | string | required if `mockup2` present, e.g. "Open the Power BI report" |
| `pitch` | string | one sentence. What the user sees or gets. Concrete, no abstractions. |
| `body` | string | 3 to 6 sentences. Why it matters, why it is sequenced where it is, what it is not. |
| `quote` | `{text, attr}` | a real client line from a transcript. `attr` must say "paraphrased" if it is. Omit rather than fabricate. |
| `callNote` | string | one or two sentences on how it gets built, appended after the `calls[].note` |
| `architecture[]` | array | 4 to 6 `{node, sub, ink}`. `ink` is one of `source`, `orchestrate`, `reason`, `human`, `output`. Named by what the node does, not its colour. |
| `io.inputs[]` | array | 2 to 4 strings. What goes in, in business terms. |
| `io.outputs[]` | array | 2 to 3 strings. What comes out. |
| `io.fields[]` | array | 8 to 14 snake_case field names. Indicative shape, not a schema. |
| `io.sampleSource` | string | key into `sampleSources` |
| `io.ask` | string | the specific data ask, with volumes: "30 to 50 real customer PO PDFs" |
| `io.why` | string | why mock data will not do, or why it will |
| `io.owner` | string | which client function owns the data |
| `source` | string | evidence pointer: requirement ID, catalog row, or `call-YYYY-MM` |
| `demoType` | string | `model-driven` \| `dashboard` \| `portal` |
| `regions[]` | array | keys into `operatingRegionModel`. Omit for single-region clients. |
| `qualifiers[]` | array | `{label, body}`. Per-item statements the brief page must render. **Group-level qualifiers come from `groups[]` and are added by the shell; this array is only for the item-specific ones** (a 1/5 data readiness score, a capability that is white space because it postdates the briefing package, a platform choice that was RSM's rather than the client's). Populated from the Discovery Pack's QUALIFIERS field. |

## operatingRegionModel

Keyed by region name. Each `{role, note, kind}` where `kind` is `parent` \| `region` \| `exception`.
Pair with `operatingRegions[]` and, where the corpus disagrees with itself, `regionNote`.

---

## Qualifiers must be data, not code

An earlier version of the brief shell hardcoded item-specific rules in JavaScript:

```js
if (i.ref === 'B7') quals.push(['Copilot is an RSM recommendation', ...]);
if (i.ref === 'B8') quals.push(['White space, not a reinterpretation', ...]);
if (i.ref === 'A1') quals.push(['Data readiness 1/5', ...]);
```

That works for one client and breaks the moment the shell is reused. Copied forward, the next
client's B7 inherits a disclaimer it never earned while its own real qualifier goes unrendered,
and the page still looks correct. Group-level rules (`i.group === 'B'`, `i.group === 'D'`) stay
in the shell because they are structural. Ref-level rules move to `ideas[].qualifiers[]` and the
shell renders whatever is there.

The same failure was still live in `public/data-asks/index.html`, which carried a literal array
of a previous client's extracts keyed to `B1`, `B2` and `B3`. It is the worse version of the bug:
where a stale qualifier renders quietly, a stale ask names another client on a page that deploys
world-readable, and it only surfaced here because the refs stopped resolving and the page threw.
Had the refs happened to resolve, the page would have looked correct while naming somebody else.
That list is now `client.namedAsks[]`, and an unresolvable ref is skipped rather than thrown on.

The rule generalizes: **anything in `public/` that names a specific extract, system, account or
ref belongs in `manifest.json`.** A literal in a shared shell is a leak waiting for the next copy.

## Non-negotiables

1. **Every `ideas[]` entry carries a `source`.** No opportunity without an evidence pointer.
2. **Provenance travels with the item, not a footnote.** If it is RSM-authored, `group` says so and
   the brief renders the qualifier.
3. **Nothing unverified is asserted as fact.** Unknown incumbent systems stay unnamed in
   `manifest.json`. Name the gap on the data-asks page instead.
4. **`manifest.json` is public.** It deploys to a URL with no access control. Competitive position,
   named executives, win themes and pricing go in `docs/pursuit-notes.md`, never here.
