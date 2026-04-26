// Attendance percentage thresholds — used for badge/dot color decisions in card and overview views.
// Two levels: ≥GOOD shows yellow, ≥GREAT shows green, below shows red.
export const ATTENDANCE_BADGE_THRESHOLDS = {
    GREAT: 75,
    GOOD: 50,
} as const

// Status color thresholds — finer-grained 5-level scale used inside the detailed stats matrix.
export const STATUS_COLOR_THRESHOLDS = {
    VERY_LOW: 15,
    LOW: 30,
    MEDIUM: 50,
    HIGH: 75,
} as const

// Default target session duration used for the calendar progress bar.
// Represents a typical 70-minute class session.
export const TARGET_SESSION_SECONDS = 70 * 60 // 4200

// Course number range shown as named sections on the dashboard.
export const COURSE_NUMBERS = [4, 3, 2, 1] as const
export type CourseNumber = (typeof COURSE_NUMBERS)[number]

// Section definitions for the dashboard grouped view.
// The `key` maps to analytics.sections.<key> in i18n.
export const COURSE_SECTIONS = COURSE_NUMBERS.map(n => ({
    course: n,
    id: `course-${n}`,
    key: `course${n}` as const,
}))
