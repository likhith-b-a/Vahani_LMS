const normalizeText = (value?: string | null) => value?.trim().toLowerCase() || "";

export function matchesSelfEnrollmentScholarRules(
  scholar: { batch?: string | null; gender?: string | null },
  options: {
    enabled: boolean;
    allowedBatches?: string[];
    allowedGenders?: string[];
  },
) {
  if (!options.enabled) {
    return true;
  }

  const allowedBatches = (options.allowedBatches || []).map(normalizeText).filter(Boolean);
  const allowedGenders = (options.allowedGenders || []).map(normalizeText).filter(Boolean);

  if (allowedBatches.length > 0 && !allowedBatches.includes(normalizeText(scholar.batch))) {
    return false;
  }

  if (allowedGenders.length > 0 && !allowedGenders.includes(normalizeText(scholar.gender))) {
    return false;
  }

  return true;
}
