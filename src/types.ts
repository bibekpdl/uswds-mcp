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
}

export interface IndexBundle {
  records: UswdsRecord[];
  manifest: Manifest;
}
