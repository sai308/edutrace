/**
 * Formats a percentage mark to a 5-scale system.
 */
export function to5Scale(percent: number): number {
    if (percent >= 90) return 5;
    if (percent >= 75) return 4;
    if (percent >= 60) return 3;
    if (percent >= 35) return 2;
    return 1;
}

/**
 * Formats a percentage mark to ECTS (A-F).
 */
export function toECTS(percent: number): string {
    if (percent >= 90) return 'A';
    if (percent >= 82) return 'B';
    if (percent >= 75) return 'C';
    if (percent >= 67) return 'D';
    if (percent >= 60) return 'E';
    if (percent >= 35) return 'FX';
    return 'F';
}

/**
 * Formats a percentage mark to 100-scale (rounded).
 */
export function to100Scale(percent: number): number {
    return Math.round(percent);
}

export type MarkFormat = '5-scale' | 'ects' | '100-scale';

/**
 * Creates a formatter function based on the format name.
 */
export function createMarkFormatter(format: MarkFormat | string): (percent: number) => string | number {
    return (percent: number) => {
        if (!format || format === '5-scale') return to5Scale(percent);
        if (format === 'ects') return toECTS(percent);
        if (format === '100-scale') return to100Scale(percent);
        return Math.round(percent);
    };
}

/**
 * Helper to convert a raw score with max points to 5-scale.
 */
export function formatMarkToFiveScale(score: number | string, maxPoints: number | string): number {
    const max = Number(maxPoints) || 100;
    const percent = (Number(score) / max) * 100;
    return to5Scale(percent);
}
