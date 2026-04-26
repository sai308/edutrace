import type { Member } from '../../types/students'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { studentsRepository } from '../students.repository'

describe('studentsRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getIepMap', () => {
        it('returns a map of id → iep for members that have an IEP set', async () => {
            const members: Partial<Member>[] = [
                { id: 's1', name: 'Alice', role: 'student', iep: 'IEP-001' },
                { id: 's2', name: 'Bob', role: 'student', iep: 'IEP-002' },
                { id: 's3', name: 'Carol', role: 'student' }, // no IEP
                { id: 's4', name: 'Dave', role: 'student', iep: '' }, // empty string — falsy, excluded
            ]
            vi.spyOn(studentsRepository, 'getAllMembers').mockResolvedValue(members as Member[])

            const result = await studentsRepository.getIepMap()

            expect(result).toEqual({ s1: 'IEP-001', s2: 'IEP-002' })
        })

        it('returns an empty map when no members have an IEP', async () => {
            vi.spyOn(studentsRepository, 'getAllMembers').mockResolvedValue([
                { id: 's1', name: 'Alice', role: 'student' } as Member,
            ])

            const result = await studentsRepository.getIepMap()

            expect(result).toEqual({})
        })

        it('passes includeHidden option through to getAllMembers', async () => {
            const spy = vi.spyOn(studentsRepository, 'getAllMembers').mockResolvedValue([])

            await studentsRepository.getIepMap({ includeHidden: true })

            expect(spy).toHaveBeenCalledWith({ includeHidden: true })
        })

        it('returns an empty map when there are no members at all', async () => {
            vi.spyOn(studentsRepository, 'getAllMembers').mockResolvedValue([])

            const result = await studentsRepository.getIepMap()

            expect(result).toEqual({})
        })
    })

    describe('saveMember', () => {
        it('should set groupName to null if role is teacher', async () => {
            const putSpy = vi.spyOn(studentsRepository, 'put').mockResolvedValue('123')
            const member = {
                id: '123',
                name: 'Teacher Joe',
                groupName: 'Math Group',
                role: 'teacher',
            }

            await studentsRepository.saveMember(member as any)

            expect(member.groupName).toBeNull()
            expect(putSpy).toHaveBeenCalledWith(member)
        })

        it('should set groupName to null if role is assistant', async () => {
            const addSpy = vi.spyOn(studentsRepository, 'add').mockResolvedValue('new-id')
            const member = {
                name: 'Assistant Jane',
                groupName: 'Science Group',
                role: 'assistant',
            }

            await studentsRepository.saveMember(member as any)

            expect(member.groupName).toBeNull()
            expect(addSpy).toHaveBeenCalledWith(member)
        })

        it('should keep groupName if role is student', async () => {
            const putSpy = vi.spyOn(studentsRepository, 'put').mockResolvedValue('456')
            const member = {
                id: '456',
                name: 'Student Mark',
                groupName: 'History Group',
                role: 'student',
            }

            await studentsRepository.saveMember(member as any)

            expect(member.groupName).toBe('History Group')
            expect(putSpy).toHaveBeenCalledWith(member)
        })
    })
})
