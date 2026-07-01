export type ResourceKey = "plasmids" | "strains" | "cell-lines" | "primers" | "antibodies" | "viruses";

export interface ColumnDef {
  key: string;
  label: string;
  mono?: boolean;
  width?: number;
}

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "float" | "textarea" | "array" | "sequence" | "select";
  options?: string[];
  showWhen?: { field: string; value: string };
  readOnly?: boolean;
}

export interface ResourceConfig {
  label: string;
  apiPath: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  hasStatus: boolean;
}

export const RESOURCE_CONFIGS: Record<ResourceKey, ResourceConfig> = {
  plasmids: {
    label: "Plasmides",
    apiPath: "plasmids",
    hasStatus: true,
    columns: [
      { key: "code", label: "Code", mono: true, width: 110 },
      { key: "name", label: "Nom" },
      { key: "backbone", label: "Backbone", width: 120 },
      { key: "status", label: "Statut", width: 90 },
    ],
    fields: [
      { key: "code", label: "Code", readOnly: true },
      { key: "name", label: "Nom" },
      { key: "backbone", label: "Backbone" },
      { key: "insert_name", label: "Insert" },
      { key: "length_bp", label: "Longueur (bp)", type: "number" },
      { key: "host_strain", label: "Souche hôte" },
      { key: "resistance", label: "Résistances", type: "array" },
      { key: "box_location", label: "Localisation" },
      { key: "status", label: "Statut" },
      { key: "sequence", label: "Séquence ADN", type: "sequence" },
      { key: "notes_md", label: "Notes", type: "textarea" },
    ],
  },
  strains: {
    label: "Souches",
    apiPath: "strains",
    hasStatus: true,
    columns: [
      { key: "code", label: "Code", mono: true, width: 110 },
      { key: "name", label: "Nom" },
      { key: "species", label: "Espèce", width: 150 },
      { key: "status", label: "Statut", width: 90 },
    ],
    fields: [
      { key: "code", label: "Code", readOnly: true },
      { key: "name", label: "Nom" },
      { key: "species", label: "Espèce" },
      { key: "genotype", label: "Génotype", type: "textarea" },
      { key: "box_location", label: "Localisation" },
      { key: "status", label: "Statut" },
      { key: "notes_md", label: "Notes", type: "textarea" },
    ],
  },
  "cell-lines": {
    label: "Lignées cell.",
    apiPath: "cell-lines",
    hasStatus: true,
    columns: [
      { key: "code", label: "Code", mono: true, width: 110 },
      { key: "name", label: "Nom" },
      { key: "species", label: "Espèce", width: 120 },
      { key: "tissue", label: "Tissu", width: 110 },
      { key: "status", label: "Statut", width: 90 },
    ],
    fields: [
      { key: "code", label: "Code", readOnly: true },
      { key: "name", label: "Nom" },
      { key: "species", label: "Espèce" },
      { key: "tissue", label: "Tissu" },
      { key: "passage_number", label: "Passage", type: "number" },
      { key: "medium", label: "Milieu" },
      { key: "box_location", label: "Localisation" },
      { key: "status", label: "Statut" },
      { key: "notes_md", label: "Notes", type: "textarea" },
    ],
  },
  primers: {
    label: "Primers",
    apiPath: "primers",
    hasStatus: false,
    columns: [
      { key: "code", label: "Code", mono: true, width: 110 },
      { key: "name", label: "Nom" },
      { key: "category", label: "Catégorie", width: 105 },
      { key: "direction", label: "Direction", width: 90 },
      { key: "tm_celsius", label: "Tm (°C)", width: 75 },
    ],
    fields: [
      { key: "code", label: "Code", readOnly: true },
      { key: "name", label: "Nom" },
      { key: "category", label: "Catégorie", type: "select", options: ["Infusion", "qPCR", "Génotypage", "PCR"] },
      { key: "donor_plasmid", label: "Plasmide donneur", showWhen: { field: "category", value: "Infusion" } },
      { key: "recipient_plasmid", label: "Plasmide receveur", showWhen: { field: "category", value: "Infusion" } },
      { key: "sequence", label: "Séquence 5'→3'", type: "textarea" },
      { key: "direction", label: "Direction" },
      { key: "tm_celsius", label: "Tm (°C)", type: "float" },
      { key: "gc_percent", label: "GC%", type: "float" },
      { key: "target", label: "Cible" },
      { key: "box_location", label: "Localisation" },
      { key: "notes_md", label: "Notes", type: "textarea" },
    ],
  },
  antibodies: {
    label: "Anticorps",
    apiPath: "antibodies",
    hasStatus: true,
    columns: [
      { key: "code", label: "Code", mono: true, width: 110 },
      { key: "name", label: "Nom" },
      { key: "target", label: "Cible", width: 120 },
      { key: "clonality", label: "Clonalité", width: 95 },
      { key: "status", label: "Statut", width: 90 },
    ],
    fields: [
      { key: "code", label: "Code", readOnly: true },
      { key: "name", label: "Nom" },
      { key: "target", label: "Cible" },
      { key: "host", label: "Hôte" },
      { key: "clone", label: "Clone" },
      { key: "clonality", label: "Clonalité" },
      { key: "vendor", label: "Fournisseur" },
      { key: "catalog_number", label: "Référence catalogue" },
      { key: "lot", label: "Lot" },
      { key: "dilution", label: "Dilution" },
      { key: "box_location", label: "Localisation" },
      { key: "status", label: "Statut" },
      { key: "notes_md", label: "Notes", type: "textarea" },
    ],
  },
  viruses: {
    label: "Virus",
    apiPath: "viruses",
    hasStatus: true,
    columns: [
      { key: "code", label: "Code", mono: true, width: 110 },
      { key: "name", label: "Nom" },
      { key: "kind", label: "Type", width: 100 },
      { key: "bsl_level", label: "BSL", width: 55 },
      { key: "status", label: "Statut", width: 90 },
    ],
    fields: [
      { key: "code", label: "Code", readOnly: true },
      { key: "name", label: "Nom" },
      { key: "kind", label: "Type" },
      { key: "serotype", label: "Sérotype" },
      { key: "transgene", label: "Transgène" },
      { key: "titer", label: "Titre (TU/mL)", type: "float" },
      { key: "volume_uL", label: "Volume (µL)", type: "float" },
      { key: "bsl_level", label: "Niveau BSL", type: "number" },
      { key: "box_location", label: "Localisation" },
      { key: "status", label: "Statut" },
      { key: "notes_md", label: "Notes", type: "textarea" },
    ],
  },
};

export const RESOURCE_KEYS = Object.keys(RESOURCE_CONFIGS) as ResourceKey[];
