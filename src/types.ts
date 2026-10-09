export type UswdsRecordType =
  | "component"
  | "pattern"
  | "template"
  | "utility"
  | "token"
  | "setting"
  | "package"
  | "accessibility_test"
  | "implementation_reference";

export interface Section {
  heading: string;
  content: string;
}

export interface LatestUpdate {
  date?: string;
  version?: string;
  affects?: string[];
  breaking?: boolean;
  description: string;
}

export interface PackageInfo {
  name: string;
  usage?: string;
  dependencies: string[];
  hasJavascript: boolean;
  hasSass: boolean;
  hasTwig: boolean;
  sourcePath?: string;
}

export interface UswdsRecord {
  id: string;
  type: UswdsRecordType;
  slug: string;
  title: string;
  summary: string;
  body: string;
  sections: Section[];
  docUrl?: string;
  sourcePath?: string;
  sourceUrl?: string;
  package?: PackageInfo;
  relatedPackages?: string[];
  variants?: string[];
  settings?: string[];
  whenToUse?: string[];
  whenNotToUse?: string[];
  usabilityGuidance?: string[];
  accessibilityGuidance?: string[];
  latestUpdates?: LatestUpdate[];
  examples?: string[];
  tags?: string[];
}

export interface SearchResult {
  record: UswdsRecord;
  score: number;
  matchedSections: string[];
}

export interface Manifest {
  generatedAt: string | null;
  sources: Array<{
    name: "uswds-site" | "uswds";
    url: string;
    commit?: string;
    version?: string;
  }>;
  recordCounts: Record<string, number>;
  markupSource?: { package: string; version?: string };
}

export interface IndexBundle {
  records: UswdsRecord[];
  manifest: Manifest;
}

/** Canonical HTML rendered from the official USWDS twig templates and JSON fixtures. */
export interface MarkupSnippet {
  id: string;
  kind: "component" | "page-template";
  /** Component slug, e.g. `accordion`, `footer`, or a page template such as `sign-in`. */
  component: string;
  /** `default`, or modifiers such as `bordered`, `slim`, `big+outline`. */
  variant: string;
  package?: string;
  /** HTML with `{{USWDS_ASSET_PATH}}` where the USWDS dist asset root belongs. */
  html: string;
  classes: string[];
  requiresJavascript: boolean;
  sourcePath: string;
  /** `uswds` = rendered from the official package; `curated` = hand-maintained, tested against the USWDS class list. */
  origin?: "uswds" | "curated";
}

export interface ClassIndex {
  uswdsVersion?: string;
  classes: string[];
}
