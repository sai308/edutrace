// Category: Science & Tech
export const scienceIcons = [
    'Atom',
    'Binary',
    'Code',
    'FlaskConical',
    'Server',
    'SquareTerminal',
    'BugOff',
]

// Category: Education & Writing
export const educationIcons = [
    'BookOpen',
    'GraduationCap',
    'NotebookPen',
    'NotebookText',
    'PencilRuler',
    'PenTool',
    'ScrollText',
]

// Category: Business & General
export const businessIcons = [
    'Box',
    'BrickWall',
    'BriefcaseBusiness',
    'BrainCircuit',
    'Calendar',
    'ChartNoAxesGantt',
    'Globe',
    'Scale',
    'ShieldEllipsis',
    'UsersRound',
]

export const allSelectionIcons = [...scienceIcons, ...educationIcons, ...businessIcons].sort()

/**
 * Converts PascalCase icon names to Title Case with spaces
 * e.g., 'NotebookPen' -> 'Notebook Pen'
 */
export function getIconTitle(name: string): string {
    return name.replace(/([A-Z])/g, ' $1').trim()
}
