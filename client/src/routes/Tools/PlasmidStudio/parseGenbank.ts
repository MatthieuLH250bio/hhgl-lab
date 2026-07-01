export interface ParsedFeature {
  name: string;
  kind: string;
  start_bp: number;
  end_bp: number;
  strand: string;
}

export interface ParsedPlasmid {
  name: string;
  length_bp: number | null;
  sequence: string;
  features: ParsedFeature[];
}

// GenBank feature type → our kind vocabulary
const KIND_MAP: Record<string, string> = {
  CDS:              "cds",
  gene:             "cds",
  mRNA:             "cds",
  exon:             "cds",
  promoter:         "promoter",
  regulatory:       "promoter",
  terminator:       "terminator",
  RBS:              "rbs",
  rep_origin:       "ori",
  misc_feature:     "misc",
  misc_binding:     "misc",
  sig_peptide:      "misc",
  transit_peptide:  "misc",
  mat_peptide:      "misc",
  intron:           "misc",
  LTR:              "misc",
};

// Parse GenBank location string → {start, end, strand}
// Handles: 1..100, complement(1..100), join(1..50,80..100), complement(join(...))
function parseLocation(loc: string): { start: number; end: number; strand: string } | null {
  const strand = loc.includes("complement") ? "-" : "+";
  // Strip complement() and join()
  const stripped = loc.replace(/complement\(|join\(|\)/g, "");
  // Find all n..m ranges
  const ranges = [...stripped.matchAll(/(\d+)\.\.(\d+)/g)];
  if (ranges.length > 0) {
    const starts = ranges.map((m) => parseInt(m[1]));
    const ends   = ranges.map((m) => parseInt(m[2]));
    return { start: Math.min(...starts), end: Math.max(...ends), strand };
  }
  // Single position
  const single = stripped.match(/(\d+)/);
  if (single) {
    const n = parseInt(single[1]);
    return { start: n, end: n, strand };
  }
  return null;
}

// Strip surrounding quotes from a GenBank qualifier value
function unquote(v: string): string {
  return v.replace(/^"(.*)"$/, "$1").replace(/^"|"$/g, "");
}

export function parseGenBank(text: string): ParsedPlasmid {
  const lines = text.split(/\r?\n/);

  // ── LOCUS line → name + length ───────────────────────────────────────────
  let name = "Plasmide importé";
  let length_bp: number | null = null;

  const locusLine = lines.find((l) => l.startsWith("LOCUS"));
  if (locusLine) {
    const parts = locusLine.split(/\s+/).filter(Boolean);
    // LOCUS  <name>  <length>  bp  ...
    if (parts[1]) name = parts[1];
    const bpIdx = parts.indexOf("bp");
    if (bpIdx > 0) length_bp = parseInt(parts[bpIdx - 1]) || null;
  }

  // ── State machine for FEATURES + ORIGIN ──────────────────────────────────
  const features: ParsedFeature[] = [];
  let sequence = "";
  let inFeatures = false;
  let inOrigin = false;

  // Currently-accumulating feature
  let cType = "";
  let cLoc = "";
  let cQuals: Record<string, string> = {};
  let seenQual = false;

  function commit() {
    if (!cType || cType === "source") return;
    const loc = parseLocation(cLoc);
    if (!loc) return;
    // Find first qualifier with a real (non-boolean) value
    const NAME_KEYS = ["label", "ApEinfo_label", "gene", "product", "locus_tag", "note"];
    const raw =
      NAME_KEYS.map((k) => cQuals[k]).find((v) => v && v !== "true") ?? cType;
    features.push({
      name: unquote(raw).slice(0, 64),
      kind: KIND_MAP[cType] ?? "misc",
      start_bp: loc.start,
      end_bp: loc.end,
      strand: loc.strand,
    });
  }

  for (const line of lines) {
    // ── Section headers ───────────────────────────────────────────────────
    if (line.startsWith("FEATURES")) {
      inFeatures = true;
      inOrigin = false;
      continue;
    }
    if (line.startsWith("ORIGIN")) {
      if (inFeatures) commit();
      inFeatures = false;
      inOrigin = true;
      continue;
    }
    if (line.startsWith("//")) {
      if (inFeatures) commit();
      break;
    }
    // Any non-indented line outside FEATURES/ORIGIN (DEFINITION, ACCESSION…)
    if (inFeatures && line.length > 0 && line[0] !== " ") {
      commit();
      inFeatures = false;
    }

    // ── ORIGIN: collect sequence ──────────────────────────────────────────
    if (inOrigin) {
      sequence += line.replace(/\d/g, "").replace(/\s/g, "").toUpperCase();
      continue;
    }

    if (!inFeatures) continue;

    // ── FEATURES: parse lines ─────────────────────────────────────────────
    // Feature type line: exactly 5 spaces + word + ≥2 spaces + location
    const featLine = line.match(/^     ([A-Za-z_]\w*)\s{2,}(\S.*)/);
    if (featLine) {
      commit();
      cType = featLine[1];
      cLoc  = featLine[2].trim();
      cQuals = {};
      seenQual = false;
      continue;
    }

    // Qualifier line: /key  or  /key="quoted"  or  /key=unquoted
    const qualLine = line.match(/^\s+\/(\w+)(?:=(.+))?/);
    if (qualLine) {
      seenQual = true;
      const key = qualLine[1];
      if (!(key in cQuals)) {
        let val = (qualLine[2] ?? "").trim();
        // Strip surrounding double quotes if present
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        cQuals[key] = val || "true";
      }
      continue;
    }

    // Location continuation (before any qualifier has been seen)
    if (!seenQual && cLoc && line.match(/^\s+\S/)) {
      cLoc += line.trim();
    }
    // Qualifier value continuation lines are ignored (we only need short values)
  }

  if (!length_bp && sequence.length > 0) length_bp = sequence.length;

  return { name, length_bp, sequence, features };
}
