export interface BaseResource {
  id: string;
  code: string;
  name: string;
  status?: string;
  notes_md?: string;
  box_location?: string;
  created_at: string;
  updated_at: string;
}

export interface PlasmidFeature {
  id: string;
  name: string;
  kind?: string;
  start_bp: number;
  end_bp: number;
  strand?: string;
  color?: string;
}

export interface Plasmid extends BaseResource {
  backbone?: string;
  insert_name?: string;
  length_bp?: number;
  resistance?: string[];
  host_strain?: string;
  sequence?: string;
  features?: PlasmidFeature[];
}

export interface Strain extends BaseResource {
  species?: string;
  genotype?: string;
  parent_strain_id?: string;
}

export interface CellLine extends BaseResource {
  species?: string;
  tissue?: string;
  passage_number?: number;
  medium?: string;
}

export interface Primer {
  id: string;
  code: string;
  name: string;
  sequence?: string;
  length_nt?: number;
  tm_celsius?: number;
  gc_percent?: number;
  target?: string;
  direction?: string;
  box_location?: string;
  notes_md?: string;
  created_at: string;
  updated_at: string;
}

export interface Antibody extends BaseResource {
  target?: string;
  host?: string;
  clone?: string;
  clonality?: string;
  applications?: string[];
  vendor?: string;
  catalog_number?: string;
  lot?: string;
  dilution?: string;
}

export interface Virus extends BaseResource {
  kind?: string;
  serotype?: string;
  transgene?: string;
  titer?: number;
  volume_uL?: number;
  bsl_level?: number;
}

export type AnyResource = Plasmid | Strain | CellLine | Primer | Antibody | Virus;
