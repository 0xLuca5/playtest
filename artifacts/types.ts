export const MIDSCENE_REPORT = 'midscene_report' as const;
export type MidsceneReportType = typeof MIDSCENE_REPORT;

export const TEST_CASE_ARTIFACT = 'test_case_artifact' as const;
export type TestCaseArtifactType = typeof TEST_CASE_ARTIFACT;

type ReportType = MidsceneReportType | TestCaseArtifactType;

export const MIDSCENE_DELTA = 'data-midscene-delta' as const;
export type MidsceneDELTAType = typeof MIDSCENE_DELTA;

export const TEST_CASE_DELTA = 'test-case-delta' as const;
export type TestCaseDeltaType = typeof TEST_CASE_DELTA;