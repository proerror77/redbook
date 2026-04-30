const { hasText, normalizeWhitespace } = require('./utils');

function normalizeBossDigits(value) {
  const extraDigitMap = {
    '\uE03A': '7',
  };
  return String(value || '').replace(/[\uE030-\uE03A]/g, (char) => {
    if (extraDigitMap[char]) {
      return extraDigitMap[char];
    }
    return String(char.charCodeAt(0) - 0xE030);
  });
}

function parseSalaryRange(text) {
  const normalized = normalizeWhitespace(normalizeBossDigits(text));
  const match = normalized.match(/(\d+)(?:-(\d+))?\s*[kK]/);
  if (!match) {
    return null;
  }
  return {
    minMonthlyK: Number(match[1]),
    maxMonthlyK: Number(match[2] || match[1]),
  };
}

function parseExperience(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized || normalized.includes('经验不限')) {
    return { minYears: 0, maxYears: 0, unrestricted: true };
  }
  const match = normalized.match(/(\d+)(?:-(\d+))?\s*年/);
  if (!match) {
    return { minYears: null, maxYears: null, unrestricted: false };
  }
  return {
    minYears: Number(match[1]),
    maxYears: Number(match[2] || match[1]),
    unrestricted: false,
  };
}

function containsAny(text, candidates) {
  return candidates.some((candidate) => hasText(text, candidate));
}

function evaluateJob(job, filters) {
  const reasons = [];
  const haystack = [
    job.title,
    job.company,
    job.location,
    job.salaryText,
    job.experienceText,
    job.degreeText,
    job.recruiterName,
    job.recruiterTitle,
    job.stage,
    job.companySize,
    job.summary,
  ]
    .filter(Boolean)
    .join(' | ');

  const salaryText = normalizeWhitespace(job.salaryText);
  if (salaryText.includes('元/天')) {
    reasons.push('daily_rate_excluded');
  }
  if (salaryText.includes('元/周')) {
    reasons.push('weekly_rate_excluded');
  }

  if (filters.includeKeywords.length > 0 && !containsAny(haystack, filters.includeKeywords)) {
    reasons.push('missing_include_keyword');
  }

  if (filters.excludeKeywords.length > 0 && containsAny(haystack, filters.excludeKeywords)) {
    reasons.push('matched_exclude_keyword');
  }

  if (filters.excludeCompanyKeywords?.length > 0 && containsAny(haystack, filters.excludeCompanyKeywords)) {
    reasons.push('company_keyword_excluded');
  }

  if (containsAny(haystack, ['驻外', '驻日本', '马来西亚'])) {
    reasons.push('overseas_assignment_excluded');
  }

  if (containsAny(haystack, [
    'IDC机房运维',
    '暖通',
    '柴油发电机',
    '配电室',
    '高压电工',
    '低压电工',
    '精密空调',
    '冷水机组',
    'UPS',
    '值班长',
  ])) {
    reasons.push('facility_ops_excluded');
  }

  const salary = parseSalaryRange(salaryText);
  if (salary && salary.minMonthlyK < Number(filters.minMonthlySalaryK || 0)) {
    reasons.push('salary_below_minimum');
  }

  const experience = parseExperience(job.experienceText);
  if (!experience.unrestricted && experience.maxYears !== null && experience.maxYears > Number(filters.maxExperienceYears || 99)) {
    reasons.push('experience_above_maximum');
  }

  if (filters.allowedDegrees.length > 0) {
    const degreeText = normalizeWhitespace(job.degreeText);
    if (degreeText && !filters.allowedDegrees.some((allowed) => hasText(degreeText, allowed))) {
      reasons.push('degree_not_allowed');
    }
  }

  if (filters.excludeCompanySizes.length > 0 && containsAny(job.companySize, filters.excludeCompanySizes)) {
    reasons.push('company_size_excluded');
  }

  if (filters.excludeFundingStages.length > 0 && containsAny(job.stage, filters.excludeFundingStages)) {
    reasons.push('funding_stage_excluded');
  }

  if (filters.excludeLocations.length > 0 && containsAny(job.location, filters.excludeLocations)) {
    reasons.push('location_excluded');
  }

  if (filters.excludeRecruiterTitles.length > 0 && containsAny(job.recruiterTitle, filters.excludeRecruiterTitles)) {
    reasons.push('recruiter_title_excluded');
  }

  return {
    allow: reasons.length === 0,
    reasons,
    salary,
    experience,
  };
}

module.exports = {
  parseSalaryRange,
  parseExperience,
  evaluateJob,
  normalizeBossDigits,
};
