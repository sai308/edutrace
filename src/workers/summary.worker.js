import * as Comlink from 'comlink';
import { createMarkFormatter } from '../shared/utils/grades';

/**
 * --- Pure Helper Functions ---
 */

/**
 * Extracts a numeric score from a mark object.
 * Falls back from `score` to `value` since marks may only have `value` populated.
 */
function getScore(mark) {
    const raw = mark.score ?? mark.value;
    return raw !== undefined && raw !== null ? Number(raw) : 0;
}

/**
 * Infers the max points for a task.
 * Uses the task's maxPoints if available; otherwise infers from the score range:
 *   - scores 1-5  → max is 5 (5-point scale)
 *   - scores 6+   → max is 100 (100-point scale)
 */
function inferMaxPoints(task, score) {
    if (task && task.maxPoints && task.maxPoints > 0) return task.maxPoints;
    if (score >= 1 && score <= 5) return 5;
    return 100;
}

function calculateMeetDurations(meets, durationLimitSeconds) {
    const meetDurations = {};
    for (const meet of meets) {
        const durations = meet.participants.map(p => p.duration).sort((a, b) => a - b);
        let calculatedDuration = 0;
        if (durations.length > 0) {
            const mid = Math.floor(durations.length / 2);
            const median = durations.length % 2 !== 0
                ? durations[mid]
                : (durations[mid - 1] + durations[mid]) / 2;

            let maxValid = 0;
            const threshold = median * 2;
            for (let i = 0; i < durations.length; i++) {
                if (durations[i] <= threshold) {
                    if (durations[i] > maxValid) maxValid = durations[i];
                }
            }
            calculatedDuration = maxValid;
        }
        meetDurations[meet.id] = Math.min(calculatedDuration || 0, durationLimitSeconds);
    }
    return meetDurations;
}

function calculateAttendance(member, meets, meetDurations) {
    let attendedDuration = 0;
    let possibleDuration = 0;
    let attendedMeets = 0;
    const totalMeets = meets.length;

    const studentNames = new Set([member.name]);
    if (member.aliases) member.aliases.forEach(a => studentNames.add(a));

    for (const meet of meets) {
        const meetDuration = meetDurations[meet.id];
        if (!meetDuration || meetDuration <= 0) continue;
        possibleDuration += meetDuration;
        const participant = meet.participants.find(p => studentNames.has(p.name));
        const studentDuration = participant ? participant.duration : 0;
        attendedDuration += studentDuration;
        if (studentDuration > 0) attendedMeets++;
    }

    const percentage = possibleDuration > 0 ? (attendedDuration / possibleDuration) * 100 : 0;
    return {
        percentage,
        attendedMeets,
        totalMeets,
        attendedDuration,
        possibleDuration
    };
}

function calculateModuleStats(modules, studentMarks, taskMap, formatMark) {
    const moduleGrades = {};
    const moduleRawGrades = [];
    const moduleDetailsData = {};
    let hasPartial = false;

    for (const module of modules) {
        const testTaskId = module.test?.id ? String(module.test.id) : null;
        // Exclude testTaskId from task IDs to prevent it being matched as a regular task
        const taskIds = (module.tasks || []).map(t => String(t.id)).filter(id => id !== testTaskId);

        // Track which tasks are completed
        const completedTaskIds = new Set();
        const taskMarks = [];
        let testMark = null;
        const moduleTaskIdsSet = new Set(taskIds);

        for (const mark of studentMarks) {
            const markTaskId = String(mark.taskId);
            const score = getScore(mark);

            if (testTaskId && markTaskId === testTaskId) {
                const task = taskMap.get(markTaskId);
                const max = inferMaxPoints(task, score);
                testMark = (score / max) * 100;
            } else if (moduleTaskIdsSet.has(markTaskId)) {
                completedTaskIds.add(markTaskId);
                const task = taskMap.get(markTaskId);
                const max = inferMaxPoints(task, score);
                taskMarks.push((score / max) * 100);
            }
        }

        // Determine missing tasks (by name)
        const missingTaskIds = taskIds.filter(id => !completedTaskIds.has(id));
        const missingTaskNames = missingTaskIds.map(id => {
            const task = taskMap.get(id);
            return task?.name || id;
        });

        const totalTasks = taskIds.length;
        const completedTasks = taskMarks.length;
        const missingTest = testTaskId !== null && testMark === null;
        const hasTest = testTaskId !== null;

        // Totally empty — no tasks completed and no test
        if (completedTasks === 0 && testMark === null) {
            moduleGrades[module.name] = null;
            moduleRawGrades.push({ grade: null, partial: false });
            moduleDetailsData[module.name] = {
                type: 'empty',
                grade: null,
                missingTest: hasTest,
                missingTasks: missingTaskNames,
                completedTasks: 0,
                totalTasks
            };
            continue;
        }

        // Calculate grade
        const tasksCoeff = module.tasksCoefficient || 1;
        const testCoeff = module.testCoefficient || 1;
        let rawGrade;
        let isPartial = false;
        const formula = {};

        if (completedTasks > 0) {
            const avgTaskMark = taskMarks.reduce((sum, m) => sum + m, 0) / taskMarks.length;
            formula.avg = formatMark(avgTaskMark);
            formula.tasksCoeff = tasksCoeff;

            if (hasTest && testMark !== null) {
                // Full formula: (avgTasks*taskCoef + test*testCoef) / (taskCoef + testCoef)
                rawGrade = (avgTaskMark * tasksCoeff + testMark * testCoeff) / (tasksCoeff + testCoeff);
                formula.test = formatMark(testMark);
                formula.testCoeff = testCoeff;
            } else if (hasTest && testMark === null) {
                // Has test in config but not completed — tasks-only avg, mark as partial
                rawGrade = avgTaskMark;
                isPartial = true;
            } else {
                // No test configured — tasks-only avg
                rawGrade = avgTaskMark;
            }

            // If some tasks are missing, mark as partial
            if (missingTaskIds.length > 0) {
                isPartial = true;
            }
        } else {
            // No tasks done but test done — use test only, mark as partial
            rawGrade = testMark;
            isPartial = true;
            formula.test = formatMark(testMark);
            formula.testCoeff = testCoeff;
        }

        if (isPartial) hasPartial = true;

        const formattedGrade = formatMark(rawGrade);
        moduleGrades[module.name] = isPartial ? `~${formattedGrade}` : formattedGrade;
        moduleRawGrades.push({ grade: rawGrade, partial: isPartial });

        moduleDetailsData[module.name] = {
            type: isPartial ? 'partial' : 'complete',
            grade: rawGrade,
            missingTest: missingTest,
            missingTasks: missingTaskNames,
            completedTasks,
            totalTasks,
            formula: Object.keys(formula).length > 0 ? formula : undefined
        };
    }

    // Total: average of all module raw grades (only for modules that have grades)
    const validGrades = moduleRawGrades.filter(g => g.grade !== null);
    let total = null;
    let totalRaw = null;
    let totalPartial = false;

    if (validGrades.length > 0) {
        totalRaw = validGrades.reduce((sum, g) => sum + g.grade, 0) / validGrades.length;
        totalPartial = hasPartial || validGrades.length < modules.length;
        total = totalPartial ? `~${formatMark(totalRaw)}` : formatMark(totalRaw);
    }

    return { moduleGrades, total, totalRaw, moduleDetailsData, totalPartial };
}

/**
 * --- Worker Methods ---
 */

const summaryWorker = {
    /**
     * Calculates stats for all members.
     * @param {Array} members 
     * @param {Array} marks 
     * @param {Array} meets 
     * @param {Array} tasks 
     * @param {Object} options 
     */
    calculateSummary(members, marks, meets, tasks, modules, options) {
        const {
            durationLimitSeconds = Infinity,
            gradeFormat = '5-scale',
            requiredTasks = 0
        } = options;

        // Index Data — coerce studentId to string for consistent lookup
        const marksByStudent = new Map();
        for (const mark of marks) {
            const sid = String(mark.studentId);
            if (!marksByStudent.has(sid)) marksByStudent.set(sid, []);
            marksByStudent.get(sid).push(mark);
        }

        // Index tasks by string ID
        const taskMap = new Map();
        tasks.forEach(task => taskMap.set(String(task.id), task));

        const meetDurations = calculateMeetDurations(meets, durationLimitSeconds);
        const formatMarkFn = createMarkFormatter(gradeFormat);
        const formatFiveScale = createMarkFormatter('5-scale');

        const testTaskIds = new Set();
        modules.forEach(m => {
            if (m.test?.id) testTaskIds.add(String(m.test.id));
        });

        const regularTasks = tasks.filter(t => !testTaskIds.has(String(t.id)));

        const results = members.map(member => {
            if (member.role === 'teacher' || member.hidden) return null;

            // Coerce member.id to string for consistent lookup
            const memberId = String(member.id);
            const studentMarks = marksByStudent.get(memberId) || [];

            // Completion — coerce taskId to string for set comparison
            const completedRegularTasks = new Set(
                studentMarks
                    .filter(m => !testTaskIds.has(String(m.taskId)))
                    .map(m => String(m.taskId))
            ).size;

            const effectiveTotal = (requiredTasks > 0) ? requiredTasks : regularTasks.length;
            const completionExact = effectiveTotal > 0 ? (completedRegularTasks / effectiveTotal) * 100 : 0;

            // Attendance
            const attendanceStats = calculateAttendance(member, meets, meetDurations);

            // Grades
            const moduleStats = calculateModuleStats(modules, studentMarks, taskMap, formatMarkFn);

            // Avg Mark — use getScore + inferMaxPoints helpers
            let totalGrade = 0;
            let validMarksCount = 0;
            studentMarks.forEach(mark => {
                const score = getScore(mark);
                const task = taskMap.get(String(mark.taskId));
                const max = inferMaxPoints(task, score);
                totalGrade += formatFiveScale((score / max) * 100);
                validMarksCount++;
            });
            const averageMark = validMarksCount > 0 ? totalGrade / validMarksCount : 0;

            return {
                id: member.id,
                stats: {
                    completionExact,
                    completedRegularTasks,
                    effectiveTotal,
                    attendance: attendanceStats,
                    modules: moduleStats,
                    averageMark
                }
            };
        }).filter(Boolean);

        return results;
    }
};

export const workerForTesting = summaryWorker;
Comlink.expose(summaryWorker);
