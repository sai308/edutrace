import * as Comlink from 'comlink';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { MEET_REPORT_KEYWORDS, MARKS_CSV_REQUIRED_HEADERS, MARKS_CSV_KEYWORDS } from '../shared/constants/headers';

/**
 * --- Shared Constants & Helpers ---
 */

function findKeyByKeywords(obj, keywords) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return undefined;
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    return keys.find(k => {
        const lowerKey = k.toLowerCase();
        return lowerKeywords.some(keyword => lowerKey.includes(keyword));
    });
}

function findHeaderByKeywords(headers, keywords) {
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    return headers.find(h => {
        const lowerHeader = h.toLowerCase();
        return lowerKeywords.some(keyword => lowerHeader.includes(keyword));
    });
}

function parseSingleCSVLine(line) {
    const parsed = Papa.parse(line, {
        header: false,
        skipEmptyLines: true,
        delimiter: ','
    });
    return parsed.data[0] || [];
}

function processName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length < 2) return fullName;
    const last = parts.pop();
    return [last, ...parts].join(' ');
}

/**
 * --- Meet Report Parsing Logic ---
 */

function extractMetadata(lines, filename) {
    let meetId = 'unknown-meet';
    let date = null;
    let startTime = null;
    let endTime = null;
    let csvStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.startsWith('"') && line.endsWith('"')) {
            line = line.slice(1, -1);
        }

        if (line.startsWith('*')) {
            const meetingCodeMatch = line.match(/Meeting code:\s*(.*)/);
            if (meetingCodeMatch) meetId = meetingCodeMatch[1].trim();

            const createdOnMatch = line.match(/Created on\s*(.*)/);
            if (createdOnMatch) {
                try {
                    const d = new Date(createdOnMatch[1].trim());
                    date = d.toISOString().split('T')[0];
                    startTime = d.toISOString();
                } catch (e) {
                    console.error('Failed to parse creation date from metadata', createdOnMatch[1], e);
                }
            }

            const endedOnMatch = line.match(/Ended on\s*(.*)/);
            if (endedOnMatch) {
                try {
                    endTime = new Date(endedOnMatch[1].trim()).toISOString();
                } catch (e) {
                    console.error('Failed to parse end date from metadata', endedOnMatch[1], e);
                }
            }
        } else if (MEET_REPORT_KEYWORDS.name.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))) {
            csvStartIndex = i;
            break;
        }
    }

    if (meetId === 'unknown-meet') {
        const meetIdMatch = filename.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/);
        if (meetIdMatch) meetId = meetIdMatch[0];
    }
    if (!date) {
        const dateMatch = filename.match(/\d{4}-\d{2}-\d{2}/);
        date = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];
    }

    return { meetId, date, startTime, endTime, csvStartIndex };
}

function parseDuration(str) {
    if (!str) return 0;
    str = str.trim();
    let seconds = 0;

    if (str.includes(':')) {
        const parts = str.split(':').map(p => parseInt(p, 10));
        if (parts.some(isNaN)) return 0;
        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    } else {
        const hrMatch = str.match(/(\d+)\s*hr/i);
        const minMatch = str.match(/(\d+)\s*min/i);
        const secMatch = str.match(/(\d+)\s*s/i);

        if (hrMatch) seconds += parseInt(hrMatch[1], 10) * 3600;
        if (minMatch) seconds += parseInt(minMatch[1], 10) * 60;
        if (secMatch) seconds += parseInt(secMatch[1], 10);
    }
    return seconds;
}


/**
 * --- Marks CSV Parsing Logic ---
 */

// Basic helpers for Marks CSV logic are shared or inline

/**
 * --- Worker Methods ---
 */

const parser = {
    parseMeetReport(fileContent, filename) {
        // fileContent is expected to be a string (text) read from File
        const text = fileContent;
        const lines = text.split('\n');
        const { meetId, date, startTime, endTime, csvStartIndex } = extractMetadata(lines, filename);

        const csvContent = lines.slice(csvStartIndex).join('\n');
        const parsed = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true
        });

        if (parsed.data.length === 0) throw new Error('Invalid Meet report: No participants found.');
        const firstRow = parsed.data[0];

        const durationKey = findKeyByKeywords(firstRow, MEET_REPORT_KEYWORDS.duration);
        const nameKey = findKeyByKeywords(firstRow, MEET_REPORT_KEYWORDS.name);
        const emailKey = findKeyByKeywords(firstRow, MEET_REPORT_KEYWORDS.email);
        const joinTimeKey = findKeyByKeywords(firstRow, MEET_REPORT_KEYWORDS.joinTime);

        if (!durationKey) {
            const hasMaxPoints = lines.some(l => {
                const lowerL = l.toLowerCase();
                return MARKS_CSV_KEYWORDS.maxPoints.some(kw => lowerL.includes(kw.toLowerCase()));
            });
            if (hasMaxPoints) throw new Error('Invalid Meet report: This looks like a Marks CSV. Please upload a Google Meet attendance report.');
            throw new Error('Invalid Meet report: Missing required column "Duration".');
        }
        if (!nameKey) throw new Error('Invalid Meet report: Missing required column "Full Name".');

        const uniqueParticipants = new Map();

        parsed.data.forEach(row => {
            const rawName = row[nameKey];
            if (!rawName) return;

            const processedName = processName(rawName);
            const duration = parseDuration(row[durationKey]);
            if (duration === 0) return;

            const p = {
                id: uuidv4(),
                name: processedName,
                originalName: rawName,
                email: emailKey ? row[emailKey] : '',
                duration: duration,
                joinTime: joinTimeKey ? row[joinTimeKey] : null
            };

            if (!uniqueParticipants.has(p.name)) {
                uniqueParticipants.set(p.name, p);
            } else {
                const existing = uniqueParticipants.get(p.name);
                existing.duration += p.duration;
                if (p.joinTime && (!existing.joinTime || p.joinTime < existing.joinTime)) {
                    existing.joinTime = p.joinTime;
                }
            }
        });

        if (uniqueParticipants.size === 0) throw new Error('Invalid Meet report: No participants with valid attendance found.');

        return {
            id: uuidv4(),
            meetId,
            date,
            startTime,
            endTime,
            filename,
            uploadedAt: new Date().toISOString(),
            participants: Array.from(uniqueParticipants.values())
        };
    },

    parseMarksCSV(fileContent, filename) {
        const text = fileContent;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        if (lines.length < 4) throw new Error('Invalid CSV format: Insufficient lines.');
        if (lines[0].startsWith('*')) throw new Error('Invalid Marks CSV: This looks like a Google Meet report.');

        const headerLine = lines[0];
        const headers = parseSingleCSVLine(headerLine);
        const hasNameColumn = findHeaderByKeywords(headers, MARKS_CSV_REQUIRED_HEADERS);
        if (!hasNameColumn) throw new Error('Invalid Marks CSV: Missing "Surname" column.');

        const dates = parseSingleCSVLine(lines[1]);
        const rawMaxPoints = parseSingleCSVLine(lines[2]);

        const groupNameMatch = filename.match(/^([^_]+)_/);
        const groupName = groupNameMatch ? groupNameMatch[1] : 'Unknown Group';

        const taskNames = headers.slice(3);
        const taskDates = dates.slice(3);
        const taskMaxPoints = rawMaxPoints.slice(3).map(p => parseInt(p.replace(/[^\d.]/g, '') || '0', 10));

        if (taskNames.length === 0 || taskNames.length !== taskDates.length || taskNames.length !== taskMaxPoints.length) {
            throw new Error('Invalid Marks CSV: Mismatch or absence of task header rows.');
        }

        const tasks = taskNames.map((name, index) => ({
            name: name.trim(),
            date: taskDates[index].trim(),
            maxPoints: taskMaxPoints[index],
            groupName: groupName
        }));

        const studentsData = [];
        for (let i = 3; i < lines.length; i++) {
            const line = lines[i];
            const cols = parseSingleCSVLine(line);
            if (cols.length < 3) continue;

            const lastName = (cols[0] || '').trim();
            const firstName = (cols[1] || '').trim();
            const email = (cols[2] || '').trim();
            const fullName = `${lastName} ${firstName}`.trim();

            if (!fullName) continue;

            const marks = [];
            const scoreStartIndex = 3;

            for (let j = 0; j < taskNames.length; j++) {
                const markValue = cols[scoreStartIndex + j];
                if (markValue && markValue.trim().length > 0) {
                    const score = parseFloat(markValue.trim());
                    if (!isNaN(score)) {
                        marks.push({ taskIndex: j, score, synced: false });
                    }
                }
            }
            studentsData.push({
                student: { name: fullName, email, groupName },
                marks
            });
        }

        return { groupName, tasks, studentsData };
    }
};

Comlink.expose(parser);
