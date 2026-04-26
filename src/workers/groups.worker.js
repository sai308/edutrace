import * as Comlink from 'comlink';
import { formatMarkToFiveScale } from '../shared/utils/grades';

function calculateMemberCounts(members, meets, teacherSet, meetToGroup) {
    // Calculate unique members per group
    const groupMemberSets = {}; // groupName -> Set(studentName)
    const groupMemberIds = {}; // groupName -> Set(studentId)

    // 1. From Member entity explicit groupName
    members.forEach(m => {
        if (teacherSet.has(m.name)) return;
        if (m.groupName) {
            if (!groupMemberSets[m.groupName]) {
                groupMemberSets[m.groupName] = new Set();
                groupMemberIds[m.groupName] = new Set();
            }
            groupMemberSets[m.groupName].add(m.name);
            groupMemberIds[m.groupName].add(m.id);
        }
    });

    // 2. From Meets participants
    meets.forEach(meet => {
        const groupName = meetToGroup[meet.meetId];
        if (groupName) {
            if (!groupMemberSets[groupName]) {
                groupMemberSets[groupName] = new Set();
                groupMemberIds[groupName] = new Set();
            }
            meet.participants.forEach(p => {
                if (!teacherSet.has(p.name)) {
                    groupMemberSets[groupName].add(p.name);
                    // Can't easily add ID for unsaved members, relying on sync for IDs
                }
            });
        }
    });

    // Convert Sets to counts
    const counts = {};
    for (const [name, set] of Object.entries(groupMemberSets)) {
        counts[name] = set.size;
    }

    return { counts, ids: groupMemberIds };
}

function processGroupStats(groups, groupMemberIds, allTasks, allMarks) {
    // 1. Map tasks to groups
    const tasksByGroup = {};
    allTasks.forEach(task => {
        if (!tasksByGroup[task.groupName]) tasksByGroup[task.groupName] = [];
        tasksByGroup[task.groupName].push(task.id);
    });

    // 2. Map marks to students
    const marksByStudent = {}; // studentId -> Set(taskId)
    const marksByStudentList = {}; // studentId -> [Mark]
    allMarks.forEach(mark => {
        if (!marksByStudent[mark.studentId]) {
            marksByStudent[mark.studentId] = new Set();
            marksByStudentList[mark.studentId] = [];
        }
        marksByStudent[mark.studentId].add(mark.taskId);
        marksByStudentList[mark.studentId].push(mark);
    });

    // 3. Calculate for each group
    return groups.map(group => {
        const g = { ...group }; // Clone to avoid mutation of original if cached
        const groupName = g.name;
        const memberIds = groupMemberIds[groupName] ? Array.from(groupMemberIds[groupName]) : [];
        const groupTaskIds = tasksByGroup[groupName] || [];
        const totalGroupTasks = groupTaskIds.length;

        if (totalGroupTasks === 0 || memberIds.length === 0) {
            g.avgTaskCompletion = 0;
            g.avgMark = 0;
            g.modeMark = 0;
            g.medianMark = 0;
            return g;
        }

        // Task Completion
        let totalStudentCompletionPercent = 0;
        memberIds.forEach(studentId => {
            const studentCompletedTasks = marksByStudent[studentId] || new Set();
            let completedCount = 0;
            groupTaskIds.forEach(taskId => {
                if (studentCompletedTasks.has(taskId)) {
                    completedCount++;
                }
            });
            const completionPercent = (completedCount / totalGroupTasks) * 100;
            totalStudentCompletionPercent += completionPercent;
        });
        g.avgTaskCompletion = totalStudentCompletionPercent / memberIds.length;

        // Marks Stats
        const groupMarks = [];
        memberIds.forEach(studentId => {
            const studentMarks = marksByStudentList[studentId] || [];
            studentMarks.forEach(mark => {
                const task = allTasks.find(t => t.id === mark.taskId);
                if (task) {
                    const grade = formatMarkToFiveScale(mark.score, task.maxPoints);
                    groupMarks.push(grade);
                }
            });
        });

        if (groupMarks.length > 0) {
            // Average
            const sum = groupMarks.reduce((a, b) => a + b, 0);
            g.avgMark = sum / groupMarks.length;

            // Mode
            const frequency = {};
            let maxFreq = 0;
            let mode = groupMarks[0];
            groupMarks.forEach(m => {
                frequency[m] = (frequency[m] || 0) + 1;
                if (frequency[m] > maxFreq) {
                    maxFreq = frequency[m];
                    mode = m;
                }
            });
            g.modeMark = mode;

            // Median
            const sortedMarks = [...groupMarks].sort((a, b) => a - b);
            const mid = Math.floor(sortedMarks.length / 2);
            if (sortedMarks.length % 2 === 0) {
                g.medianMark = (sortedMarks[mid - 1] + sortedMarks[mid]) / 2;
            } else {
                g.medianMark = sortedMarks[mid];
            }
        } else {
            g.avgMark = 0;
            g.modeMark = 0;
            g.medianMark = 0;
        }

        return g;
    });
}

function processGroupsData(groups, meets, members, teacherList, allTasks, allMarks) {
    // Create a map of meetId -> groupName
    const meetToGroup = {};
    groups.forEach(g => {
        if (g.meetId) meetToGroup[g.meetId] = g.name;
    });

    // Identify teachers
    const teacherSet = new Set(teacherList);
    members.forEach(m => {
        if (m.role === 'teacher') teacherSet.add(m.name);
    });

    const memberCounts = calculateMemberCounts(members, meets, teacherSet, meetToGroup);
    const processedGroups = processGroupStats(groups, memberCounts.ids, allTasks, allMarks);

    // Extract unique meet IDs and potential teachers
    const meetIds = new Set();
    const teachers = new Set();

    meets.forEach(meet => {
        if (meet.meetId) meetIds.add(meet.meetId);
        if (meet.participants) {
            meet.participants.forEach(p => teachers.add(p.name));
        }
    });

    return {
        groups: processedGroups,
        memberCounts: memberCounts.counts,
        allMeetIds: Array.from(meetIds).sort(),
        allTeachers: Array.from(teachers).sort(),
        teacherSet: teacherSet
    };
}

export const workerForTesting = { processGroupsData };
Comlink.expose({ processGroupsData });
