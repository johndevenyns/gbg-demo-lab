import type { TestUserProfile } from '@/hooks/useTestProfiles';
import type { StoredTestData, TestProfileOption } from '@/types/demo';

/** Build the per-demo snapshot of selectable profiles. Empty selection → defaults. */
export function buildProfileSnapshot(all: TestUserProfile[], selectedIds?: string[] | null): TestProfileOption[] {
  const chosen = selectedIds && selectedIds.length
    ? all.filter((p) => selectedIds.includes(p.id))
    : all.filter((p) => p.is_default);
  return chosen.map((p) => ({ id: p.id, name: p.profile_name, type: p.profile_type, data: { ...(p.field_data || {}) } }));
}

/** Apply a snapshot to stored test data, keeping pass/fail fallback data in sync. */
export function withProfiles(current: StoredTestData | undefined, profiles: TestProfileOption[]): StoredTestData {
  const firstPass = profiles.find((p) => p.type === 'pass');
  const firstFail = profiles.find((p) => p.type === 'fail');
  return {
    ...(current || { passData: {}, failData: {} }),
    profiles,
    passData: firstPass?.data || current?.passData || {},
    failData: firstFail?.data || current?.failData || {},
  };
}

/** "Of Age - Pass" → "Of Age" for display inside a Pass/Fail menu. */
export function shortProfileLabel(name: string) {
  return name.replace(/\s*[-–]\s*(pass|fail)\s*$/i, '').trim() || name;
}
