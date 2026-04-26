import { describe, it, expect } from 'vitest'
import { workerForTesting } from '../parser.worker.js'

describe('parser.worker.js', () => {
    describe('parseMeetReport', () => {
        it('should parse a valid meet report', () => {
            const csv = [
                '* Meeting notes',
                '* Meeting code: abc-defg-hij',
                '* Created on Nov 15 2023 10:00:00 AM UTC',
                'Full name,Email,Duration',
                'John Doe,john@example.com,1:30:00',
                'Jane Smith,jane@example.com,0:45:00',
            ].join('\n')

            const result = workerForTesting.parseMeetReport(csv, 'report_2023-11-15.csv')

            expect(result.meetId).toBe('abc-defg-hij')
            expect(result.date).toBe('2023-11-15')
            expect(result.participants).toHaveLength(2)
            // processName: "John Doe" → last word moves first → "Doe John"
            expect(result.participants.find((p: any) => p.name === 'Doe John')).toBeDefined()
            expect(result.participants.find((p: any) => p.name === 'Smith Jane')).toBeDefined()
        })

        it('should sum durations when the same name appears multiple times', () => {
            const csv = [
                '* Meeting code: abc-defg-hij',
                'Full name,Duration',
                'John Doe,1:00:00',
                'John Doe,0:30:00',
            ].join('\n')

            const result = workerForTesting.parseMeetReport(csv, 'report.csv')

            expect(result.participants).toHaveLength(1)
            expect(result.participants[0].duration).toBe(5400) // 1:30:00 = 5400 s
        })

        it('should keep the earliest joinTime when later arrival is processed first', () => {
            // Row 1 arrives at 10:00 AM (later), Row 2 at 9:00 AM (earlier).
            // The participant reconnected; the earliest join time should be stored.
            const csv = [
                '* Meeting code: abc-defg-hij',
                'Full name,Duration,Join time',
                'John Doe,1:00:00,Nov 1 2023 10:00:00 AM',
                'John Doe,0:30:00,Nov 1 2023 9:00:00 AM',
            ].join('\n')

            const result = workerForTesting.parseMeetReport(csv, 'report.csv')

            expect(result.participants).toHaveLength(1)
            expect(result.participants[0].joinTime).toBe('Nov 1 2023 9:00:00 AM')
        })

        it('should not replace an earlier joinTime with a later one', () => {
            // Row 1 arrives at 9:00 AM (earlier), Row 2 at 10:00 AM (later).
            const csv = [
                '* Meeting code: abc-defg-hij',
                'Full name,Duration,Join time',
                'John Doe,1:00:00,Nov 1 2023 9:00:00 AM',
                'John Doe,0:30:00,Nov 1 2023 10:00:00 AM',
            ].join('\n')

            const result = workerForTesting.parseMeetReport(csv, 'report.csv')

            expect(result.participants).toHaveLength(1)
            expect(result.participants[0].joinTime).toBe('Nov 1 2023 9:00:00 AM')
        })

        it('should skip participants with zero duration', () => {
            const csv = ['Full name,Duration', 'Ghost User,0:00:00', 'Real User,1:00:00'].join('\n')

            const result = workerForTesting.parseMeetReport(csv, 'report.csv')

            expect(result.participants).toHaveLength(1)
            expect(result.participants[0].name).toBe('User Real')
        })

        it('should infer meetId from filename when not in metadata', () => {
            const csv = ['Full name,Duration', 'John Doe,1:00:00'].join('\n')

            const result = workerForTesting.parseMeetReport(csv, 'abc-defg-hij_2023-11-15.csv')

            expect(result.meetId).toBe('abc-defg-hij')
        })

        it('should infer date from filename when not in metadata', () => {
            const csv = ['Full name,Duration', 'John Doe,1:00:00'].join('\n')

            const result = workerForTesting.parseMeetReport(csv, 'report_2023-11-15.csv')

            expect(result.date).toBe('2023-11-15')
        })

        it('should throw when Duration column is missing', () => {
            const csv = ['Full name,Email', 'John Doe,john@example.com'].join('\n')

            expect(() => workerForTesting.parseMeetReport(csv, 'report.csv')).toThrow(
                'Missing required column "Duration"',
            )
        })

        it('should throw a specific error when input looks like a Marks CSV', () => {
            const csv = ['Full name,Email', ',', 'Max Points,,100', 'Doe,John,85'].join('\n')

            expect(() => workerForTesting.parseMeetReport(csv, 'marks.csv')).toThrow(
                'This looks like a Marks CSV',
            )
        })

        it('should throw when no valid participants are found', () => {
            const csv = ['Full name,Duration'].join('\n')

            expect(() => workerForTesting.parseMeetReport(csv, 'report.csv')).toThrow(
                'No participants found',
            )
        })
    })

    describe('parseMarksCSV', () => {
        function makeCSV(studentRows = ['Doe,John,john@example.com,8,9']): string {
            return [
                "Прізвище,Ім'я,Email,Lab 1,Lab 2",
                ',,,2023-11-01,2023-11-08',
                ',,,10,10',
                ...studentRows,
            ].join('\n')
        }

        it('should parse a valid marks CSV', () => {
            const result = workerForTesting.parseMarksCSV(makeCSV(), 'G1_marks.csv', 'Group A')

            expect(result.groupName).toBe('Group A')
            expect(result.tasks).toHaveLength(2)
            expect(result.tasks[0].name).toBe('Lab 1')
            expect(result.tasks[0].maxPoints).toBe(10)
            expect(result.studentsData).toHaveLength(1)
            expect(result.studentsData[0].student.name).toBe('Doe John')
            expect(result.studentsData[0].marks).toHaveLength(2)
            expect(result.studentsData[0].marks[0].score).toBe(8)
        })

        it('should infer group name from filename prefix when not provided', () => {
            const result = workerForTesting.parseMarksCSV(makeCSV(), 'GroupB_marks.csv', null)
            expect(result.groupName).toBe('GroupB')
        })

        it('should skip marks with empty or non-numeric values', () => {
            const result = workerForTesting.parseMarksCSV(
                makeCSV(['Doe,John,john@example.com,,abc']),
                'G1_marks.csv',
                'G1',
            )
            expect(result.studentsData[0].marks).toHaveLength(0)
        })

        it('should parse numeric marks and store task index', () => {
            const result = workerForTesting.parseMarksCSV(
                makeCSV(['Doe,John,john@example.com,7,']),
                'G1_marks.csv',
                'G1',
            )
            expect(result.studentsData[0].marks[0].taskIndex).toBe(0)
            expect(result.studentsData[0].marks[0].score).toBe(7)
        })

        it('should throw when file has fewer than 4 rows', () => {
            const csv = "Прізвище,Ім'я,Email\n,,,\n"
            expect(() => workerForTesting.parseMarksCSV(csv, 'marks.csv', null)).toThrow(
                'Insufficient lines',
            )
        })

        it('should throw when Surname column is missing', () => {
            const csv = 'Name,First,Email,Task\n,,,\n,,,\nDoe,John,john@example.com,85\n'
            expect(() => workerForTesting.parseMarksCSV(csv, 'marks.csv', null)).toThrow(
                'Missing "Surname" column',
            )
        })

        it('should throw when input looks like a Meet report', () => {
            // parseMarksCSV checks allRows[0][0].startsWith('*') but only AFTER the
            // length check (< 4 rows). Need at least 4 rows to reach the Meet guard.
            const csv =
                '* Meeting notes\nFull name,Duration\nJohn Doe,1:00:00\nJane Smith,0:30:00\n'
            expect(() => workerForTesting.parseMarksCSV(csv, 'report.csv', null)).toThrow(
                'Google Meet report',
            )
        })
    })
})
