import * as Comlink from 'comlink';
import { createMarkFormatter } from '../shared/utils/grades';

/**
 * --- Pure Helper Functions ---
 */

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
    const calculatedGrades = [];
    const moduleDetailsData = {}; // Structured data for main thread to localize
    let isAutomaticCandidate = true;
    let automaticFailureReason = null;

    if (modules.length === 0) isAutomaticCandidate = false;

    for (const module of modules) {
        const taskIds = (module.tasks || []).map(t => t.id);
        const testTaskId = module.test?.id;

        if (taskIds.length === 0 || !testTaskId) {
            isAutomaticCandidate = false;
            continue;
        }

        const taskMarks = [];
        let testMark = null;
        const moduleTaskIdsSet = new Set(taskIds);

        for (const mark of studentMarks) {
            if (moduleTaskIdsSet.has(mark.taskId)) {
                const task = taskMap.get(mark.taskId);
                if (task && task.maxPoints > 0) {
                    taskMarks.push((mark.score / task.maxPoints) * 100);
                }
            } else if (mark.taskId === testTaskId) {
                const task = taskMap.get(mark.taskId);
                if (task && task.maxPoints > 0) {
                    testMark = (mark.score / task.maxPoints) * 100;
                }
            }
        }

        const minRequired = module.minTasksRequired || 1;

        if (testMark === null || taskMarks.length < minRequired) {
            isAutomaticCandidate = false;
            if (!automaticFailureReason) {
                if (testMark === null) automaticFailureReason = { type: 'missingTest', module: module.name };
                else automaticFailureReason = { type: 'notEnoughTasks', module: module.name };
            }
        }

        if (taskMarks.length < minRequired || testMark === null) {
            if (testMark === null) {
                moduleDetailsData[module.name] = { type: 'incompleteMissingTest' };
            } else {
                const missing = minRequired - taskMarks.length;
                moduleDetailsData[module.name] = { type: 'incompleteMissingTasks', count: missing };
            }
            continue;
        }

        const avgTaskMark = taskMarks.reduce((sum, mark) => sum + mark, 0) / taskMarks.length;
        const tasksCoeff = module.tasksCoefficient || 1;
        const testCoeff = module.testCoefficient || 1;
        const moduleGrade = (avgTaskMark * tasksCoeff + testMark * testCoeff) / (tasksCoeff + testCoeff);

        moduleGrades[module.name] = formatMark(moduleGrade);
        calculatedGrades.push(moduleGrade);
        moduleDetailsData[module.name] = {
            type: 'details',
            data: {
                avg: formatMark(avgTaskMark),
                tasksCoeff,
                test: formatMark(testMark),
                testCoeff
            }
        };
    }

    const totalRaw = calculatedGrades.length === modules.length && calculatedGrades.length > 0
        ? calculatedGrades.reduce((sum, grade) => sum + grade, 0) / calculatedGrades.length
        : null;

    const total = totalRaw !== null ? formatMark(totalRaw) : null;

    return { moduleGrades, total, moduleDetailsData, isAutomaticCandidate, automaticFailureReason };
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

        // Index Data
        const marksByStudent = new Map();
        for (const mark of marks) {
            const sid = mark.studentId;
            if (!marksByStudent.has(sid)) marksByStudent.set(sid, []);
            marksByStudent.get(sid).push(mark);
        }

        const taskMap = new Map();
        tasks.forEach(task => taskMap.set(task.id, task));

        const meetDurations = calculateMeetDurations(meets, durationLimitSeconds);
        const formatMarkFn = createMarkFormatter(gradeFormat);
        const formatFiveScale = createMarkFormatter('5-scale');

        const testTaskIds = new Set();
        modules.forEach(m => {
            if (m.test?.id) testTaskIds.add(m.test.id);
        });

        const regularTasks = tasks.filter(t => !testTaskIds.has(t.id));

        const results = members.map(member => {
            // Skip hidden or teacher checks? Assuming caller filtered activeMembers.
            // But let's check role here if passed.
            if (member.role === 'teacher' || member.hidden) return null;

            const studentMarks = marksByStudent.get(member.id) || [];

            // Completion
            const completedRegularTasks = new Set(
                studentMarks
                    .filter(m => !testTaskIds.has(m.taskId))
                    .map(m => m.taskId)
            ).size;

            const effectiveTotal = (requiredTasks > 0) ? requiredTasks : regularTasks.length;
            const completionExact = effectiveTotal > 0 ? (completedRegularTasks / effectiveTotal) * 100 : 0;

            // Attendance
            const attendanceStats = calculateAttendance(member, meets, meetDurations);

            // Grades
            const moduleStats = calculateModuleStats(modules, studentMarks, taskMap, formatMarkFn);

            // Avg Mark
            let totalGrade = 0;
            let validMarksCount = 0;
            studentMarks.forEach(mark => {
                const task = taskMap.get(mark.taskId);
                if (task && task.maxPoints && task.maxPoints > 0) {
                    totalGrade += formatFiveScale((mark.score / task.maxPoints) * 100);
                    validMarksCount++;
                }
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

Comlink.expose(summaryWorker);
