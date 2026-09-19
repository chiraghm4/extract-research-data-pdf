SCHEMA_DESCRIPTION = """
You extract structured data from a materials-science paper. Return ONLY valid JSON
(no markdown fences, no commentary).

The desired target is a flat database row per experimental condition (see the field
vocabulary below). Papers differ: each one reports different tables. ADAPT your
output to the paper: use the vocabulary for values that are present in the paper's
tables, and add extra tabulated data under new snake_case keys when the tables
contain it. Do NOT limit yourself to the examples — anything clearly stated in a
table belongs in the JSON.

=== ENVELOPE ===

{
  "paper": {
    "paper_title": string or null,            // full title from the front matter
    "year": number or null,
    "source_or_type": string or null          // journal/article type, e.g. "Article"
  },
  "materials": [ ... ],
  "conditions": [ ... ]
}

=== materials[] ===

One entry per DISTINCT material whose properties appear in tables. Use this
vocabulary for values reported in the paper (set each to its table value as a
number; omit or null when the paper does not report it):

- "material_analyzed": string            // e.g. "Cement", "Glass Powder"
- "specific_gravity": number
- "d10", "d50", "d75", "d90", "d100": number   // particle-size distribution percentiles in um
- "blaine": number or string             // fineness; may carry units in the source cell
- "amorphous_phase_pct": number
- oxide composition keys by formula, e.g. "SiO2", "Al2O3", "Fe2O3", "CaO",
  "MgO", "SO3", "Na2O", "K2O", "LOI", plus ANY other oxides the tables list
- "particle_size_note": string or null

If the tables report further physical/chemical properties for a material
(fineness ranges, density spread, additional oxides, etc.), add them as
snake_case keys with numeric or short-string values. Never leave a reported
value out just because it is not listed above.

=== conditions[] ===

One entry per DISTINCT experimental condition (distinct grade, mix type
replacement vs addition, or specimen type mortar vs concrete are SEPARATE
conditions). Do not merge them.

- "condition_id": string                // short unique id, e.g. "cond_33_repl_0pct"
- "material_analyzed": string           // which material's strengths/properties these are (must match a materials[] entry name if present)
- "specimen_type": "mortar" | "concrete" | "paste" or null
- "mix_type": "replacement" | "addition" or null
- "concrete_grade_mpa": number or null
- "wb_ratio": number or null
- "admixture_type": string or null
- "admixture_dosage_pct": number or null
- mechanical-property maps keyed by age/property and replacement %, e.g.:
    "strength_7d_mpa":   {"0pct": 28.7, "5pct": 30.1, ...}
    "strength_28d_mpa":  {"0pct": 32.2, "5pct": 33.84, ...}
    "strength_1d_mpa":   {...}, "strength_14d_mpa": {...},
    "flexural_28d_mpa":  {...}, "modulus_28d_mpa": {...}
  Use the ACTUAL replacement percentages reported in the table as the map keys
  (e.g. "0pct", "10pct", "30pct"). For any other mechanical property reported in
  a table (slump, density, thermal conductivity, absorption, etc.), use a
  descriptive snake_case map or scalar key.
- "data_source": string                 // e.g. "Table 7" or "Fig. 11 (digitized, approximate)"
- "low_confidence": boolean             // true only if read off a chart/figure instead of a table

=== RULES ===

- Extract values ONLY from the paper's TABLES. Ignore narrative prose and
  equations even if they state numbers.
- If reading from a figure is unavoidable (no table has the value), set
  low_confidence=true and cite the figure.
- Do NOT invent values. If the paper does not report a field, omit it or set null.
- Keep numbers as numbers (no units, no %, no "MPa", no text inside numeric cells).
  Preserve strings verbatim where the source cell is a string (e.g. blaine "3475 cm²/g").
- Preserve EVERY tabular value you can classify; do not collapse distinct
  rows/percentages/ages into one number.
"""