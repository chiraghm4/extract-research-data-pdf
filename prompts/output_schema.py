SCHEMA_DESCRIPTION = """
Return ONLY valid JSON (no markdown fences, no commentary) matching this shape:

{
  "materials": [
    {
      "material_analyzed": string,          // e.g. "Cement", "Glass Powder"
      "specific_gravity": number or null,
      "SiO2": number or null, "Al2O3": number or null, "Fe2O3": number or null,
      "CaO": number or null, "MgO": number or null, "SO3": number or null,
      "Na2O": number or null, "K2O": number or null, "LOI": number or null,
      "particle_size_note": string or null
    }
  ],
  "conditions": [
    {
      "condition_id": string,
      "specimen_type": "mortar" | "concrete" | "paste",
      "mix_type": "replacement" | "addition",
      "concrete_grade_mpa": number or null,
      "wb_ratio": number or null,
      "admixture_type": string or null,
      "admixture_dosage_pct": number or null,
      "strength_7d_mpa": {"0pct": number, "5pct": number, ...} or {},
      "strength_28d_mpa": {"0pct": number, "5pct": number, ...} or {},
      "data_source": string,                // e.g. "Table 7" or "Fig. 11 (digitized, approximate)"
      "low_confidence": boolean             // true if read off a chart, not a table
    }
  ]
}

Rules:
- One entry per DISTINCT experimental condition. Do not merge different grades,
  mix types (replacement vs addition), or specimen types (mortar vs concrete)
  into a single condition.
- Pull strength numbers from tables when available. Only use figures if no
  table has the value, and set low_confidence=true when you do.
- Use null for anything not reported. Do not invent values.
"""