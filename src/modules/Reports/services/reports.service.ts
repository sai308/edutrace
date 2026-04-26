import type { Meet } from '@Analytics/types/analytics'
import type { Member } from '@Students/types/students'

import type { ReportProcessingStats } from '../types/reports'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { studentsRepository } from '@Students/services/students.repository'
import * as Comlink from 'comlink'
import { logger } from '@/shared/lib/logger'

import { classifyWorkerError, withTimeout } from '@/shared/lib/workerError'
import { IdentityReconciler } from '@/shared/services/reconciliation/IdentityReconciler'
import { settingsRepository } from '@/shared/services/settings.repository'
import { normalizeGroupName } from '@/shared/utils/groupNormalization'
import ParserWorker from '@/workers/parser.worker?worker'

const PARSER_TIMEOUT_MS = 30_000

interface ParserWorkerAPI {
    parseMarksCSV: (text: string, filename: string) => Promise<any>
    parseMeetReport: (text: string, filename: string) => Promise<Meet>
}

export class ReportsService {
    private identityReconciler: IdentityReconciler
    private worker: Worker
    private parser: Comlink.Remote<ParserWorkerAPI>

    constructor() {
        this.identityReconciler = new IdentityReconciler()
        this.worker = new (ParserWorker as any)()
        this.parser = Comlink.wrap(this.worker)
    }

    async parseFile(file: File): Promise<Meet> {
        const text = await file.text()
        try {
            return await withTimeout(
                this.parser.parseMeetReport(text, file.name),
                PARSER_TIMEOUT_MS,
            )
        } catch (e) {
            throw classifyWorkerError(e)
        }
    }

    /**
     * Process multiple files: parse, validate, save.
     */
    async processFiles(
        files: File[],
        filterMode: 'all' | 'related' = 'all',
    ): Promise<ReportProcessingStats> {
        const stats: ReportProcessingStats = { saved: 0, skipped: 0, unrecognized: 0 }

        if (!files || files.length === 0) return stats

        // Load dependencies in parallel
        const [groupsMap, limitMinutes] = await Promise.all([
            groupsRepository.getGroupMap(),
            settingsRepository.getDurationLimit(),
        ])

        const limitSeconds = limitMinutes > 0 ? limitMinutes * 60 : 0

        // Parse all files first
        const parsePromises = files.map((f) => this.parseFile(f))
        let results: Meet[] = []
        try {
            results = await Promise.all(parsePromises)
        } catch (e) {
            logger.error('Parsing error:', e)
            throw e
        }

        for (const result of results) {
            // Filter mode check
            if (filterMode === 'related') {
                const hasGroup = groupsMap[result.meetId]
                if (!hasGroup) {
                    logger.warn(`Skipping file with unrecognized group ID: ${result.meetId}`)
                    stats.unrecognized++
                    continue
                }
            }

            // Duplicate check
            const isDup = await meetsRepository.isDuplicateFile(
                result.filename || '',
                result.meetId,
                result.date,
            )
            if (isDup) {
                logger.warn(`Skipping duplicate file: ${result.filename}`)
                stats.skipped++
                continue
            }

            // Apply duration limit
            if (limitSeconds > 0) {
                result.participants.forEach((p) => {
                    if (p.duration > limitSeconds) {
                        p.duration = limitSeconds
                    }
                })
            }

            // Sync Students if group exists
            const group = groupsMap[result.meetId]

            // Normalize group name if a group was found, otherwise fallback
            const allGroups = Object.values(groupsMap)
            const normalizedGroupName = group
                ? normalizeGroupName(group.name, allGroups)
                : 'Unknown'

            // Always process students, use 'Unknown' if group missing
            const rawStudents = result.participants.map((p) => ({
                name: p.name,
                email: p.email || '',
                groupName: normalizedGroupName,
            }))

            const allMembers = await studentsRepository.getAllMembers({ includeHidden: true })
            const reconciledIdentities = await this.identityReconciler.resolveIdentities(
                rawStudents,
                allMembers,
            )

            // Add required fields for storage if new
            const studentsToSave: Member[] = reconciledIdentities.map(
                (s) =>
                    ({
                        ...s,
                        role: s.role || 'student',
                    }) as Member,
            )

            // Deduplicate by ID before saving
            const uniqueStudentsToSave = Array.from(
                new Map(studentsToSave.map((s) => [s.id, s])).values(),
            )

            // Bulk save students
            await studentsRepository.bulkPut(uniqueStudentsToSave)

            // Update participants with resolved IDs
            result.participants.forEach((p, index) => {
                const reconciled = reconciledIdentities[index]
                if (reconciled) {
                    p.studentId = reconciled.id
                }
            })

            // Save Meet
            await meetsRepository.saveMeet(result)
            stats.saved++
        }

        return stats
    }
}

export const reportsService = new ReportsService()
