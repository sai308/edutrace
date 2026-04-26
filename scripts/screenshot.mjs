import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const routes = [
    { path: '/attendance/analytics', name: 'attendance_analytics' },
    { path: '/attendance/reports', name: 'attendance_reports' },
    { path: '/attendance/settings', name: 'attendance_settings' },
    { path: '/org/groups', name: 'org_groups' },
    { path: '/org/students', name: 'org_students' },
    { path: '/org/settings', name: 'org_settings' },
    { path: '/org/members', name: 'org_members' },
    { path: '/control/marks', name: 'control_marks' },
    { path: '/control/settings', name: 'control_settings' },
    { path: '/control/modules', name: 'control_modules' },
    { path: '/control/summaries', name: 'control_summaries' },
    { path: '/control/tasks', name: 'control_tasks' },
    { path: '/documents/session', name: 'documents_session' },
    { path: '/documents/individual', name: 'documents_individual' },
    { path: '/documents/settings', name: 'documents_settings' },
    { path: '/about', name: 'about' },
    { path: '/guide', name: 'guide' },
]

const artifactsDir = path.join(process.cwd(), 'artifacts')
if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true })
}

(async () => {
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
    })

    const page = await context.newPage()
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

    console.log(`Initializing application and database schema...`)
    await page.goto(`http://localhost:5174/`, { waitUntil: 'networkidle', timeout: 30000 })

    console.log('Injecting Mock Data into IndexedDB...')
    await page.evaluate(async () => {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('meet-attendance-db', 17)

            req.onsuccess = (e) => {
                const db = e.target.result
                const tx = db.transaction(['groups', 'members', 'tasks', 'marks', 'units', 'meets'], 'readwrite')

                // Add Groups
                tx.objectStore('groups').put({ id: 'g1', name: 'Software Engineering A', course: 3, meetId: 'meet-dev-1' })
                tx.objectStore('groups').put({ id: 'g2', name: 'Applied Mathematics B', course: 2, meetId: 'meet-dev-2' })

                // Add Members
                tx.objectStore('members').put({ id: 1, name: 'Alice Freeman', groupName: 'Software Engineering A', role: 'student' })
                tx.objectStore('members').put({ id: 2, name: 'Bob Jenkins', groupName: 'Applied Mathematics B', role: 'student' })
                tx.objectStore('members').put({ id: 3, name: 'Carol Danvers', groupName: 'Software Engineering A', role: 'student' })

                // Add Tasks
                tx.objectStore('tasks').put({ id: 1, name: 'Midterm Exam', normalizedName: 'midtermexam' })
                tx.objectStore('tasks').put({ id: 2, name: 'Final Project', normalizedName: 'finalproject' })

                // Add Units
                tx.objectStore('units').put({ id: 1, name: 'Module 1: Advanced Algorithms', normalizedName: 'mod1' })

                // Add Marks
                tx.objectStore('marks').put({
                    id: 1,
                    taskId: 1,
                    studentId: 1,
                    groupName: 'Software Engineering A',
                    createdAt: Date.now(),
                    value: '95',
                })
                tx.objectStore('marks').put({
                    id: 2,
                    taskId: 1,
                    studentId: 3,
                    groupName: 'Software Engineering A',
                    createdAt: Date.now(),
                    value: '88',
                })
                tx.objectStore('marks').put({
                    id: 3,
                    taskId: 2,
                    studentId: 1,
                    groupName: 'Software Engineering A',
                    createdAt: Date.now(),
                    value: '100',
                })

                // Add Meets
                tx.objectStore('meets').put({
                    id: 'report-1',
                    meetId: 'meet-dev-1',
                    date: '2026-04-18',
                    startTime: '09:00',
                    endTime: '10:00',
                    filename: 'meet-dev-1-2026-04-18.csv',
                    uploadedAt: new Date().toISOString(),
                    groupName: 'Software Engineering A',
                    participants: [
                        { name: 'Alice Freeman', duration: 3600, studentId: 1 },
                        { name: 'Carol Danvers', duration: 1500, studentId: 3 },
                    ],
                })

                tx.oncomplete = resolve
                tx.onerror = reject
            }
            req.onerror = reject
        })
    })

    console.log('Reloading to apply state...')
    await page.reload({ waitUntil: 'networkidle' })
    await delay(1500)

    for (const route of routes) {
        console.log(`Navigating to ${route.path}...`)
        try {
            await page.goto(`http://localhost:5174${route.path}`, { waitUntil: 'networkidle', timeout: 30000 })
            await delay(2000) // Give JS extra time to load Data grids
            const screenshotPath = path.join(artifactsDir, `${route.name}_with_data.png`)
            await page.screenshot({ path: screenshotPath, fullPage: true })
            console.log(`Saved screenshot for ${route.name}_with_data`)
        }
        catch (error) {
            console.error(`Failed to capture ${route.path}:`, error)
        }
    }

    await page.close()
    await browser.close()
})()
