import { describe, it, expect } from 'vitest'
import { workerForTesting } from '../groups.worker.js'

describe('groups.worker.js', () => {
    describe('processGroupsData', () => {
        const baseGroup = { id: 'g1', name: 'Group A', meetId: 'meet-1' }

        it('should return processed groups and member counts from member records', () => {
            const members = [
                { id: 'm1', name: 'Alice', role: 'student', groupName: 'Group A' },
                { id: 'm2', name: 'Bob', role: 'student', groupName: 'Group A' },
            ]

            const result = workerForTesting.processGroupsData([baseGroup], [], members, [], [], [])

            expect(result.groups).toHaveLength(1)
            expect(result.memberCounts['Group A']).toBe(2)
        })

        it('should count participants from meets when members lack a groupName', () => {
            const meets = [{ meetId: 'meet-1', participants: [{ name: 'Alice' }, { name: 'Bob' }] }]

            const result = workerForTesting.processGroupsData([baseGroup], meets, [], [], [], [])

            expect(result.memberCounts['Group A']).toBe(2)
        })

        it('should exclude members with role=teacher from counts', () => {
            const members = [
                { id: 'm1', name: 'Alice', role: 'student', groupName: 'Group A' },
                { id: 'm2', name: 'Prof Smith', role: 'teacher', groupName: 'Group A' },
            ]

            const result = workerForTesting.processGroupsData([baseGroup], [], members, [], [], [])

            expect(result.memberCounts['Group A']).toBe(1)
        })

        it('should exclude names in teacherList from counts', () => {
            const meets = [
                { meetId: 'meet-1', participants: [{ name: 'Alice' }, { name: 'Guest Teacher' }] },
            ]

            const result = workerForTesting.processGroupsData(
                [baseGroup],
                meets,
                [],
                ['Guest Teacher'],
                [],
                [],
            )

            expect(result.memberCounts['Group A']).toBe(1)
        })

        it('should calculate avgTaskCompletion correctly', () => {
            const members = [
                { id: 'm1', name: 'Alice', role: 'student', groupName: 'Group A' },
                { id: 'm2', name: 'Bob', role: 'student', groupName: 'Group A' },
            ]
            const allTasks = [
                { id: 't1', name: 'Task 1', groupName: 'Group A', maxPoints: 10 },
                { id: 't2', name: 'Task 2', groupName: 'Group A', maxPoints: 10 },
            ]
            // Alice completed both tasks, Bob completed one
            const allMarks = [
                { studentId: 'm1', taskId: 't1', score: 8 },
                { studentId: 'm1', taskId: 't2', score: 9 },
                { studentId: 'm2', taskId: 't1', score: 7 },
            ]

            const result = workerForTesting.processGroupsData(
                [baseGroup],
                [],
                members,
                [],
                allTasks,
                allMarks,
            )

            // Alice: 2/2 = 100%, Bob: 1/2 = 50% → avg = 75%
            expect(result.groups[0].avgTaskCompletion).toBe(75)
        })

        it('should calculate avgMark, mode, and median from marks', () => {
            const members = [{ id: 'm1', name: 'Alice', role: 'student', groupName: 'Group A' }]
            const allTasks = [
                { id: 't1', name: 'Task 1', groupName: 'Group A', maxPoints: 10 },
                { id: 't2', name: 'Task 2', groupName: 'Group A', maxPoints: 10 },
                { id: 't3', name: 'Task 3', groupName: 'Group A', maxPoints: 10 },
            ]
            // 10/10 = 100% → to5Scale: 5
            // 8/10  =  80% → to5Scale: 4  (≥75)
            // 7/10  =  70% → to5Scale: 3  (≥60, <75)
            const allMarks = [
                { studentId: 'm1', taskId: 't1', score: 10 },
                { studentId: 'm1', taskId: 't2', score: 8 },
                { studentId: 'm1', taskId: 't3', score: 7 },
            ]

            const result = workerForTesting.processGroupsData(
                [baseGroup],
                [],
                members,
                [],
                allTasks,
                allMarks,
            )
            const group = result.groups[0]

            // groupMarks = [5, 4, 3]; sum=12, avg=4
            expect(group.avgMark).toBe(4)
            // mode: all unique — first element wins → 5
            expect(group.modeMark).toBe(5)
            // median of sorted [3, 4, 5] (odd length) = 4
            expect(group.medianMark).toBe(4)
        })

        it('should set all stats to 0 when there are no tasks', () => {
            const members = [{ id: 'm1', name: 'Alice', role: 'student', groupName: 'Group A' }]

            const result = workerForTesting.processGroupsData([baseGroup], [], members, [], [], [])
            const group = result.groups[0]

            expect(group.avgTaskCompletion).toBe(0)
            expect(group.avgMark).toBe(0)
            expect(group.modeMark).toBe(0)
            expect(group.medianMark).toBe(0)
        })

        it('should collect allMeetIds sorted alphabetically', () => {
            const groups = [
                { id: 'g1', name: 'Group A', meetId: 'meet-b' },
                { id: 'g2', name: 'Group B', meetId: 'meet-a' },
            ]
            const meets = [
                { meetId: 'meet-b', participants: [] },
                { meetId: 'meet-a', participants: [] },
            ]

            const result = workerForTesting.processGroupsData(groups, meets, [], [], [], [])

            expect(result.allMeetIds).toEqual(['meet-a', 'meet-b'])
        })

        it('should collect all participant names as allTeachers', () => {
            const meets = [{ meetId: 'meet-1', participants: [{ name: 'Alice' }, { name: 'Bob' }] }]

            const result = workerForTesting.processGroupsData([baseGroup], meets, [], [], [], [])

            expect(result.allTeachers).toContain('Alice')
            expect(result.allTeachers).toContain('Bob')
        })
    })
})
