/** Thresholds for coloring average task completion percentages. */
export const COMPLETION_THRESHOLDS = { GREAT: 75, GOOD: 50 } as const

/** Thresholds for coloring average mark scores (Ukrainian 5-point scale). */
export const MARK_THRESHOLDS = { GREAT: 4, GOOD: 3 } as const

/** Valid course number range for Ukrainian higher education (years 1–4). */
export const COURSE_MIN = 1
export const COURSE_MAX = 4

/**
 * Matches a Google Meet ID embedded in a URL or pasted as-is.
 * Format: three groups of lowercase letters separated by dashes (e.g. abc-defg-hij).
 */
export const GOOGLE_MEET_ID_PATTERN = /[a-z]{3}-[a-z]{4}-[a-z]{3}/
