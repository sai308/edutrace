export interface DetailItem {
    title: string
    description: string
}
export interface DetailGroup {
    title: string
    items: DetailItem[]
}
export interface GuideSection {
    id: string
    icon: string
    title: string
    content: string
    details: DetailGroup[]
}

export const sections: GuideSection[] = [
    {
        id: 'intro',
        icon: 'BookOpen',
        title: 'Introduction',
        content:
            'Welcome to EduTrace — an offline-first application for managing attendance, grades, student records, and exam sessions. All data is stored in your browser, giving you full privacy and control.',
        details: [
            {
                title: 'What makes EduTrace different',
                items: [
                    {
                        title: 'Your Data Stays on Your Device',
                        description:
                            'EduTrace is a local-first application. All your data — attendance reports, marks, groups, student records, exam sessions — is stored directly in your browser on your device, not on external servers.',
                    },
                    {
                        title: 'Privacy by Design',
                        description:
                            'Because your data never leaves your device, you have complete control and privacy. No one else can access your information unless you explicitly share it.',
                    },
                    {
                        title: 'Works Offline',
                        description:
                            'Once loaded, EduTrace works without an internet connection. You can view reports, enter grades, manage groups, and generate documents even when offline.',
                    },
                    {
                        title: 'No Account Required',
                        description:
                            'No account, no password, no subscription. Just open the app and start using it.',
                    },
                    {
                        title: 'Fast and Responsive',
                        description:
                            'Since everything runs locally, the app is extremely fast with instant updates and no loading delays.',
                    },
                ],
            },
            {
                title: 'Important things to know',
                items: [
                    {
                        title: 'Browser-Specific Data',
                        description:
                            'Your data is stored in your browser. If you use EduTrace in Chrome, your data won\'t appear in Firefox or Safari — each browser keeps its own separate data.',
                    },
                    {
                        title: 'Device-Specific Data',
                        description:
                            'Data on your laptop won\'t automatically sync to your phone or tablet. Each device maintains its own independent copy.',
                    },
                    {
                        title: 'Backup Regularly',
                        description:
                            'Since data is stored locally, export your data regularly via the module Settings pages or the Global Settings → Workspaces section. If you clear browser data or uninstall the browser, your EduTrace data will be lost.',
                    },
                    {
                        title: 'Sharing Between Devices',
                        description:
                            'To use EduTrace on multiple devices, export your workspace from one device and import it on another via Global Settings.',
                    },
                    {
                        title: 'Browser Storage Limits',
                        description:
                            'Browsers have storage limits (typically several hundred MB). This is more than enough for most use cases, but extremely large datasets may approach these limits.',
                    },
                ],
            },
        ],
    },
    {
        id: 'workspaces',
        icon: 'Database',
        title: 'Workspaces',
        content:
            'Workspaces are isolated environments, each with its own reports, groups, members, marks, sessions, and settings. Use them to separate semesters, academic years, or completely different courses.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Create a Workspace',
                        description:
                            'Click the workspace switcher in the top-left sidebar, then click "Create New Workspace". Enter a name (e.g., "Fall 2024"), pick an icon and color, and optionally copy settings from your current workspace.',
                    },
                    {
                        title: 'Switch Workspaces',
                        description:
                            'Click the workspace switcher to see all your workspaces. Click any workspace to switch to it. The active workspace is highlighted.',
                    },
                    {
                        title: 'Icon & Color',
                        description:
                            'Each workspace can have a unique icon and accent color. The color propagates through the entire app UI as a visual indicator of the active workspace.',
                    },
                    {
                        title: 'Export & Import a Workspace',
                        description:
                            'In Global Settings → Workspaces, each workspace has an Export button to download all its data as a JSON backup. Use Import to restore a workspace on the same or a different device.',
                    },
                    {
                        title: 'Delete a Workspace',
                        description:
                            'In the workspace switcher, hover over a workspace and click the trash icon. Type the workspace name to confirm. The default workspace cannot be deleted.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Complete Data Isolation',
                        description:
                            'Reports, groups, members, marks, and sessions in one workspace never affect another.',
                    },
                    {
                        title: 'Settings Isolation',
                        description:
                            'Each workspace has its own duration limits, default teacher, ignored users, print settings, and grade thresholds.',
                    },
                    {
                        title: 'Multi-Semester Management',
                        description:
                            'Create a workspace per semester or academic year ("Fall 2024", "Spring 2025") to keep historical data cleanly separated.',
                    },
                    {
                        title: 'Visual Identification',
                        description:
                            'Custom icons and colors make it instantly clear which workspace you\'re working in.',
                    },
                    {
                        title: 'Portable Backups',
                        description:
                            'Export a workspace to JSON and import it on another device or browser to migrate your full dataset.',
                    },
                ],
            },
        ],
    },
    {
        id: 'reports',
        icon: 'File',
        title: 'Reports',
        content:
            'The Reports page is where you upload and manage Google Meet attendance CSV files. Each uploaded file becomes a Meet record containing participant names, join/leave times, and duration data.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Upload Reports',
                        description:
                            'Drag and drop your Google Meet attendance CSV files into the drop zone at the top of the page. Multiple files can be dropped at once.',
                    },
                    {
                        title: 'Search & Filter',
                        description:
                            'Use the search bar to find specific meets by name, group, or Meet ID. Click on "Group" or "Meet ID" chips in the table to activate quick filters.',
                    },
                    {
                        title: 'Sort Data',
                        description:
                            'Click any column header (Group, Meet ID, Date, Participants, Duration) to sort. Click again to reverse order.',
                    },
                    {
                        title: 'View Details',
                        description:
                            'Click the eye icon on any row to open the detailed report view with per-participant attendance timelines and duration breakdowns.',
                    },
                    {
                        title: 'Manage Reports',
                        description:
                            'Use checkboxes to select multiple reports for bulk deletion, or use the trash icon per row to delete individually.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Centralized Attendance History',
                        description: 'A complete history of all uploaded attendance reports in one place.',
                    },
                    {
                        title: 'Automatic Group Linking',
                        description:
                            'Once groups are configured with Meet IDs, uploaded reports are automatically linked to the correct groups — making analytics and summaries more meaningful.',
                    },
                    {
                        title: 'Session Squashing',
                        description:
                            'Back-to-back meetings within a configurable time window are automatically merged into a single session, eliminating duplicate short sessions from reconnects.',
                    },
                    {
                        title: 'Duration Control',
                        description:
                            'A configurable duration limit caps how much attendance time is credited per session, so a student who joined early doesn\'t skew the data.',
                    },
                ],
            },
        ],
    },
    {
        id: 'analytics',
        icon: 'LayoutDashboard',
        title: 'Analytics',
        content:
            'The Analytics page gives you a visual dashboard of all your Meet groups. Cards show key attendance metrics for each group. Click any card to drill into per-session and per-student data.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Dashboard Overview',
                        description:
                            'Groups are organized by course number (1st, 2nd, 3rd, 4th) and an "Other" section. Click any section heading to expand or collapse it.',
                    },
                    {
                        title: 'Search',
                        description: 'Use the search bar to quickly find specific groups by name, teacher, or Meet ID.',
                    },
                    {
                        title: 'Quick Stats',
                        description:
                            'Each card shows Total Sessions, Average Duration, and Participant Count (Active / Total).',
                    },
                    {
                        title: 'Attendance Health Badge',
                        description:
                            'Color-coded badges give an instant visual indicator: green (>75%), yellow (>50%), red (<50%) average attendance.',
                    },
                    {
                        title: 'Detailed View',
                        description:
                            'Click any card to open the detailed analytics view for that group: per-session attendance chart, calendar heatmap, and student-level attendance data.',
                    },
                    {
                        title: 'QR Code',
                        description:
                            'Click the QR code icon on any card to generate a shareable join link for that Meet ID.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Trend Analysis',
                        description: 'Spot attendance trends over time across all groups and courses.',
                    },
                    {
                        title: 'Per-Student Breakdown',
                        description: 'In the detailed view, see exactly how much time each student attended each session.',
                    },
                    {
                        title: 'Calendar View',
                        description:
                            'A calendar heatmap in the detailed view shows attendance patterns month by month at a glance.',
                    },
                    {
                        title: 'Performance Identification',
                        description: 'Quickly identify groups or students with attendance problems using color-coded indicators.',
                    },
                ],
            },
        ],
    },
    {
        id: 'groups',
        icon: 'Users',
        title: 'Groups',
        content:
            'Groups connect your Meet IDs to meaningful group names and course numbers. Properly configured groups unlock automatic report linking, analytics, and summary calculations.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Create Groups',
                        description:
                            'Click "Add Group" and enter the group name, course number (1–4), Meet ID (the unique code from Google Meet), and optionally a teacher name.',
                    },
                    {
                        title: 'Search & Filter',
                        description: 'Use the search bar to quickly find groups by name, Meet ID, or teacher.',
                    },
                    {
                        title: 'Sort Data',
                        description:
                            'Click any column header (Name, Course, Meet ID, Members, Teacher, Avg Mark, Task Completion) to sort. Click again to reverse.',
                    },
                    {
                        title: 'Edit Groups',
                        description:
                            'Click the edit icon on any row to change the name, course, Meet ID, or teacher assignment.',
                    },
                    {
                        title: 'View Stats',
                        description:
                            'Optional columns show average mark, task completion rate, and median/mode mark per group. Toggle column visibility with the Columns button.',
                    },
                    {
                        title: 'Generate QR Codes',
                        description:
                            'Click the QR code icon to generate a shareable QR code for the group\'s Meet ID.',
                    },
                    {
                        title: 'Delete Groups',
                        description:
                            'Use the trash icon to remove groups no longer needed. Confirmation is required before deletion.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Organized Structure',
                        description:
                            'Map abstract Meet IDs to meaningful names and course numbers, making the rest of the app much more readable.',
                    },
                    {
                        title: 'Member Tracking',
                        description: 'See at a glance how many members are assigned to each group.',
                    },
                    {
                        title: 'Aggregated Performance Stats',
                        description:
                            'Optional stat columns show average marks, median, mode, and task completion rates per group — useful for a quick cross-group comparison.',
                    },
                    {
                        title: 'Automatic Integration',
                        description:
                            'Once groups are configured, uploaded reports, marks, and summaries are automatically linked to the correct groups.',
                    },
                ],
            },
        ],
    },
    {
        id: 'members',
        icon: 'Contact',
        title: 'Members',
        content:
            'Members are the official student roster — named records you create and maintain manually, as opposed to students discovered automatically from uploaded reports. Members serve as the authoritative source for name/email matching when importing CSV marks.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Add Members',
                        description:
                            'Click "Add Member" and fill in name, email, group, and role (Student, Teacher, or Assistant). IEP status can also be flagged here.',
                    },
                    {
                        title: 'Role Filtering',
                        description:
                            'Use the role filter tabs at the top of the table (Students / Teachers / Assistants) to narrow the list. Role counts are shown in each tab.',
                    },
                    {
                        title: 'Search',
                        description: 'Use the search bar to find members by name or email in real time.',
                    },
                    {
                        title: 'Edit Members',
                        description:
                            'Click the edit icon on any row to update the member\'s details, group assignment, or role.',
                    },
                    {
                        title: 'Soft Delete vs. Hard Delete',
                        description:
                            'The trash icon soft-deletes a member (hides them from lists but preserves data). To permanently remove, enable "Show deleted" in the filter and use the hard-delete action.',
                    },
                    {
                        title: 'Restore Deleted Members',
                        description:
                            'Toggle "Show deleted" to reveal soft-deleted members. Use the restore action to bring them back.',
                    },
                    {
                        title: 'Bulk Operations',
                        description:
                            'Enable Bulk Mode to select multiple members and delete them in one action.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Authoritative Roster',
                        description:
                            'A curated list of students and staff per group, used for name matching during marks import and for Summary calculations.',
                    },
                    {
                        title: 'Role-Based Organization',
                        description:
                            'Separate students, teachers, and assistants so that teacher names are excluded from student statistics automatically.',
                    },
                    {
                        title: 'IEP Tracking',
                        description:
                            'Flag students with Individual Education Plans (IEPs) to identify them across the application.',
                    },
                    {
                        title: 'Safe Deletion',
                        description:
                            'Soft delete preserves all historical data while hiding the member from active lists, useful when a student leaves mid-semester.',
                    },
                    {
                        title: 'Import Name Matching',
                        description:
                            'During CSV marks import, member names and emails are used to reconcile incoming data with existing records, reducing duplicates.',
                    },
                ],
            },
        ],
    },
    {
        id: 'students',
        icon: 'UserRoundSearch',
        title: 'Students',
        content:
            'The Students page shows all participants discovered from uploaded attendance reports. It aggregates each person\'s attendance, marks, and task completion across all groups they appear in — giving you a cross-group view of every student.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Search Students',
                        description:
                            'Use the search bar to find students by name, group, or Meet ID. Results update instantly as you type.',
                    },
                    {
                        title: 'Filter by Group',
                        description:
                            'Click any group chip in the Groups column to filter the table to that group only. Click the X to clear the filter.',
                    },
                    {
                        title: 'Sort Data',
                        description:
                            'Click any column header to sort — name, groups, sessions, attendance percentages, average marks, or task completion.',
                    },
                    {
                        title: 'Track Attendance',
                        description:
                            'See sessions attended (e.g., 7/8), average attendance percentage per session, and total attendance percentage.',
                    },
                    {
                        title: 'Monitor Performance',
                        description:
                            'Average marks (5-point scale) and task completion percentages are shown with color-coded indicators (green >75%, yellow >50%, red <50%).',
                    },
                    {
                        title: 'Edit Students',
                        description:
                            'Click the edit icon to update a student\'s name, email, or group assignments.',
                    },
                    {
                        title: 'Bulk Delete',
                        description:
                            'Use checkboxes to select multiple students and delete them in bulk.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Automatically Populated',
                        description:
                            'Students are created automatically when attendance CSVs are imported — no manual data entry needed.',
                    },
                    {
                        title: 'Multi-Group View',
                        description: 'See every group a student appears in across all uploaded reports.',
                    },
                    {
                        title: 'Performance Insights',
                        description:
                            'Color-coded visual indicators help quickly identify students who may need additional support.',
                    },
                    {
                        title: 'Unified Metrics',
                        description:
                            'Attendance, marks, and task completion are combined into a single row per student for easy comparison.',
                    },
                    {
                        title: 'Teacher Exclusion',
                        description:
                            'Teachers are automatically filtered out from the student list based on your Ignored Users settings.',
                    },
                ],
            },
        ],
    },
    {
        id: 'marks',
        icon: 'Star',
        title: 'Marks',
        content:
            'The Marks page is where you record and review student grades imported from CSV files. It supports multiple grading scales and keeps track of which marks have been officially recorded in your gradebook.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Upload Marks',
                        description:
                            'Drag and drop CSV files containing grades. Files should be named with the group prefix (e.g., "CS-101_marks.csv"). If the group doesn\'t exist yet, you\'ll be prompted to create it.',
                    },
                    {
                        title: 'Grade Scale Selector',
                        description:
                            'Choose how to display marks: Default (raw scores), 5-Point scale, 100-Point scale, or ECTS grades. Conversion is automatic.',
                    },
                    {
                        title: 'Hover for Breakdown',
                        description:
                            'Hover over any mark cell to see a tooltip with the full conversion: raw score, percentage, 5-point, 100-point, and ECTS grade.',
                    },
                    {
                        title: 'Search & Filter',
                        description:
                            'Use the search bar to find marks by student name, group, or task. Click the Filters button for advanced filtering by sync status, date range, or specific group.',
                    },
                    {
                        title: 'Sync Status',
                        description:
                            'Mark entries as "synced" (checkmark) once you\'ve recorded them in your official gradebook. Unsynced marks show an orange pulsing dot and are highlighted in the default view.',
                    },
                    {
                        title: 'Group Filtering',
                        description:
                            'Click any group chip in the table to instantly filter marks to that group only.',
                    },
                    {
                        title: 'Bulk Operations',
                        description:
                            'Select multiple marks with checkboxes and delete them in bulk.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Multi-Scale Grading',
                        description:
                            'Support for 5-point, 100-point, and ECTS grading systems with automatic conversion from raw imported scores.',
                    },
                    {
                        title: 'Sync Tracking',
                        description:
                            'Know exactly which marks have been officially recorded and which still need to be entered into your institution\'s system.',
                    },
                    {
                        title: 'Automatic Integration',
                        description:
                            'Marks are linked to students and groups automatically, appearing in student profiles, analytics, and Summary calculations.',
                    },
                    {
                        title: 'Intelligent Import',
                        description:
                            'When creating a new group during import, EduTrace suggests the most likely Meet ID by comparing student names in the CSV with existing participant data.',
                    },
                    {
                        title: 'Advanced Filtering',
                        description:
                            'Filter by sync status (unsynced/all), date range, or specific groups to focus on what matters right now.',
                    },
                ],
            },
        ],
    },
    {
        id: 'tasks',
        icon: 'ClipboardList',
        title: 'Tasks',
        content:
            'Tasks represent individual assignments or assessments — each with a name, maximum points, and an optional description. Tasks are referenced by Marks and grouped into Units for final grade calculations.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Create Tasks',
                        description:
                            'Click "Add Task" and enter the task name, maximum points, date, and an optional description.',
                    },
                    {
                        title: 'Search',
                        description: 'Use the search bar to filter tasks by name in real time.',
                    },
                    {
                        title: 'Edit Tasks',
                        description:
                            'Click the edit icon on any row to change the task name, maximum points, or description.',
                    },
                    {
                        title: 'Delete Tasks',
                        description:
                            'Use the trash icon to delete a task. Use Bulk Mode to select and delete multiple tasks at once.',
                    },
                    {
                        title: 'Copy Task ID',
                        description:
                            'Use the copy icon to copy the task\'s internal ID to the clipboard — useful for debugging or data management.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Assignment Registry',
                        description:
                            'A centralized list of all assignments and assessments, keeping marks and units consistent.',
                    },
                    {
                        title: 'Reusable Across Groups',
                        description:
                            'The same task can appear in marks for multiple groups — define once, use everywhere.',
                    },
                    {
                        title: 'Foundation for Units',
                        description:
                            'Tasks assigned to Units form the basis for weighted final grade calculations in the Summary module.',
                    },
                ],
            },
        ],
    },
    {
        id: 'units',
        icon: 'BookMarked',
        title: 'Modules',
        content:
            'Modules (called Units internally) group related Tasks into thematic blocks with configurable weighting. Each module can contain multiple regular tasks and one test task, each with its own coefficient. Modules are the building blocks of the final grade calculation in Summary.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Create a Module',
                        description:
                            'Click "Add Module" to open a multi-step wizard: (1) name and description, (2) select regular tasks, (3) select a test task, (4) set coefficients for task and test weight.',
                    },
                    {
                        title: 'Set Coefficients',
                        description:
                            'The coefficient controls how much weight regular tasks vs. the test task carry in the module\'s final score. Adjust these to match your grading policy.',
                    },
                    {
                        title: 'Reorder Modules',
                        description:
                            'Drag and drop modules to change their display order. Click "Save Order" to persist the new arrangement.',
                    },
                    {
                        title: 'Edit Modules',
                        description:
                            'Click the edit icon to reopen the wizard and change task assignments, coefficients, or description.',
                    },
                    {
                        title: 'Bulk Delete',
                        description:
                            'Enable Bulk Mode to select and delete multiple modules in one action.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Weighted Grade Calculation',
                        description:
                            'Control exactly how much each task and test contributes to a module\'s score using configurable coefficients.',
                    },
                    {
                        title: 'Thematic Grouping',
                        description:
                            'Group assignments by topic or teaching block to match your course structure.',
                    },
                    {
                        title: 'Summary Integration',
                        description:
                            'Module scores feed directly into the Summary page, where they are combined with attendance and exam grades to compute final results.',
                    },
                    {
                        title: 'Custom Ordering',
                        description:
                            'Arrange modules in any order with drag-and-drop — the order is reflected in the Summary table columns.',
                    },
                ],
            },
        ],
    },
    {
        id: 'summary',
        icon: 'TableProperties',
        title: 'Summary',
        content:
            'The Summary page calculates final grades for all students in a group. It combines task completion across Modules, attendance data from Reports, and optional exam grades to determine whether each student is allowed to sit the exam and what their predicted final score is.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Select a Group',
                        description:
                            'Use the group dropdown to pick which group\'s summary to view. The selection persists across navigation.',
                    },
                    {
                        title: 'Configure Thresholds',
                        description:
                            'Open the settings panel to set the completion threshold (default 70%), attendance threshold (default 60%), enable or disable the attendance requirement, and set the minimum number of required tasks. Thresholds are saved per group.',
                    },
                    {
                        title: 'Grade Format',
                        description:
                            'Toggle between 100-point scale and 5-point scale display using the format selector.',
                    },
                    {
                        title: 'Exam Grade Entry',
                        description:
                            'Click any student\'s exam grade cell to open the grade entry dialog and record their final exam result manually. The calculated status updates immediately.',
                    },
                    {
                        title: 'Student Profile',
                        description:
                            'Click any student row to open a detailed profile showing all meets attended, all tasks completed, module-by-module scores, and the final exam result.',
                    },
                    {
                        title: 'Export Data',
                        description:
                            'Export the current group\'s summary as a DOCX (formatted grade table) or CSV file. Export options are available in the Control Settings page under Summary Export.',
                    },
                    {
                        title: 'Grade Distribution',
                        description:
                            'A statistics bar at the bottom shows the ECTS grade distribution (A, B, C, D, E, FX, F) across the group at a glance.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Automated Final Grade Calculation',
                        description:
                            'Combines module scores, attendance, and exam grades into a single final result per student without manual spreadsheet work.',
                    },
                    {
                        title: 'Admission Status',
                        description:
                            'Automatically flags each student as Allowed, Not Allowed, or Automatic (passed without exam) based on your configured thresholds.',
                    },
                    {
                        title: 'Per-Group Thresholds',
                        description:
                            'Different groups can have different passing thresholds — useful when courses have different requirements.',
                    },
                    {
                        title: 'ECTS Grade Conversion',
                        description:
                            'All scores are automatically converted to ECTS letter grades (A–F) with color coding for quick identification.',
                    },
                    {
                        title: 'Exportable Results',
                        description:
                            'Download the final grade table as a formatted DOCX or plain CSV for submission to your institution.',
                    },
                ],
            },
        ],
    },
    {
        id: 'sessions',
        icon: 'GraduationCap',
        title: 'Sessions',
        content:
            'Sessions manage exam records — Main exam, First Retake, and Second Retake — in a sequential stepper. Each session captures a grade snapshot of the group and can produce a formatted DOCX document for official submission.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Select a Group',
                        description:
                            'Use the group dropdown to choose which group\'s exam session to manage.',
                    },
                    {
                        title: 'Create a Session',
                        description:
                            'Click "Create Session" to start the Main exam session. The app captures a snapshot of the group\'s students and their grades from the Summary module.',
                    },
                    {
                        title: 'Enter or Adjust Grades',
                        description:
                            'The session table lists all students. Enter or edit grades directly — the system supports both auto-calculated scores (from Summary) and manual overrides.',
                    },
                    {
                        title: 'Mark Students Absent',
                        description:
                            'Set a student\'s grade to "Absent" (null) to indicate they did not attend the exam.',
                    },
                    {
                        title: 'Close a Session',
                        description:
                            'Click "Close Session" to lock the exam record. Closing the Main session unlocks the First Retake, and closing that unlocks the Second Retake.',
                    },
                    {
                        title: 'Generate Document',
                        description:
                            'Click the print/export button to generate a DOCX exam record. If you have uploaded a custom template in Documents Settings, it will be used; otherwise, a default template is generated.',
                    },
                    {
                        title: 'Configure Print Settings',
                        description:
                            'Open Documents Settings to set subject, specialty, examiner, practical teacher, semester, academic year, and other metadata printed in the document.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Sequential Exam Flow',
                        description:
                            'The Main → First Retake → Second Retake stepper enforces the correct order and prevents accidentally creating a retake before the main session is closed.',
                    },
                    {
                        title: 'Grade Snapshot',
                        description:
                            'Grades are captured at session creation time, preserving the state of student performance at that exact moment.',
                    },
                    {
                        title: 'ECTS Statistics',
                        description:
                            'A grade distribution bar shows the breakdown across ECTS grades for the current session at a glance.',
                    },
                    {
                        title: 'Custom DOCX Output',
                        description:
                            'Upload your own DOCX template (with Mustache placeholders) in Documents Settings to generate institution-specific formatted exam records.',
                    },
                    {
                        title: 'Official Record Generation',
                        description:
                            'Produce print-ready exam documents directly from the app without any manual spreadsheet work.',
                    },
                ],
            },
        ],
    },
    {
        id: 'plans',
        icon: 'FilePen',
        title: 'Plans',
        content:
            'The Plans page manages Individual Education Plans (IEPs) for students flagged with special educational needs. It tracks which session type applies to each student (Main, First Retake, or Second Retake) and monitors their sync status.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Select a Group',
                        description:
                            'Use the group dropdown to view plans for a specific group. The first group with IEP students is pre-selected automatically.',
                    },
                    {
                        title: 'View Student Plans',
                        description:
                            'The table lists students with their current grade (numeric and ECTS), the session type applied to their plan, and sync dates.',
                    },
                    {
                        title: 'Toggle Sync',
                        description:
                            'Use the sync switch on each row to mark whether a student\'s plan has been officially processed and synced with your institution.',
                    },
                    {
                        title: 'Grade Distribution',
                        description:
                            'A statistics bar at the top shows the distribution of ECTS grades across all students in the current group\'s plans.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'IEP Tracking',
                        description:
                            'Keep track of which students require Individual Education Plans and the status of their exam session accommodations.',
                    },
                    {
                        title: 'Sync Status Monitoring',
                        description:
                            'Know at a glance which IEP records have been officially synchronized and which still need processing.',
                    },
                    {
                        title: 'Grade Visibility',
                        description:
                            'See both the numeric grade and its ECTS letter equivalent (with color coding) for each student, pulled directly from their latest session.',
                    },
                    {
                        title: 'Session Type Awareness',
                        description:
                            'Distinguish which students are on Main session plans vs. retake plans — important for official reporting.',
                    },
                ],
            },
        ],
    },
    {
        id: 'settings',
        icon: 'Settings',
        title: 'Settings',
        content:
            'EduTrace settings are split across several dedicated pages, each covering a specific area of the app. Access them from the Settings link in the sidebar footer (Global Settings) or from the settings icon within each navigation section.',
        details: [
            {
                title: 'Global Settings',
                items: [
                    {
                        title: 'Appearance',
                        description:
                            'Change the UI language (English or Ukrainian) and toggle between light and dark themes. Changes take effect immediately across the entire app.',
                    },
                    {
                        title: 'Workspaces',
                        description:
                            'View all workspaces, export individual workspace data as a JSON backup, import a workspace from a backup file, or delete workspaces you no longer need.',
                    },
                    {
                        title: 'Dev & Diagnostics',
                        description:
                            'View the current app and database version. Copy diagnostic information to share when reporting issues.',
                    },
                ],
            },
            {
                title: 'Reports Settings (Attendance → Settings)',
                items: [
                    {
                        title: 'Duration Limit',
                        description:
                            'Set the maximum session duration in minutes credited per meeting. Click "Apply to All" to retroactively update all existing meet records with the new limit.',
                    },
                    {
                        title: 'Session Squash',
                        description:
                            'Enable automatic merging of back-to-back meetings within a configurable time window (minutes). Prevents short reconnects from creating separate session records.',
                    },
                    {
                        title: 'Meet Data Management',
                        description:
                            'Export all meet data as JSON, import from a backup, or erase all meet records. Record counts and storage usage are shown for each entity.',
                    },
                ],
            },
            {
                title: 'Organization Settings (Org → Settings)',
                items: [
                    {
                        title: 'Default Teacher',
                        description:
                            'Set a default teacher name pre-filled when creating new groups.',
                    },
                    {
                        title: 'Ignored Users',
                        description:
                            'Manage the list of participants who should be excluded from student lists and statistics (e.g., teachers who join their own meetings).',
                    },
                    {
                        title: 'Member & Group Data Management',
                        description:
                            'Export, import, or erase Member and Group records independently. Record counts and storage sizes are displayed for each.',
                    },
                ],
            },
            {
                title: 'Control Settings (Control → Settings)',
                items: [
                    {
                        title: 'Marks, Tasks, and Modules Management',
                        description:
                            'Export, import, or erase Marks, Tasks, and Module records independently. Each card shows the record count and storage usage.',
                    },
                    {
                        title: 'Summary Export',
                        description:
                            'Select a group and download the final grade summary table as a formatted DOCX or plain CSV file.',
                    },
                ],
            },
            {
                title: 'Documents Settings (Documents → Settings)',
                items: [
                    {
                        title: 'Print Settings',
                        description:
                            'Configure metadata used when generating DOCX exam documents: subject name, study form, specialty, form of control, semester, academic year, total hours, examiner name, and practical teacher name.',
                    },
                    {
                        title: 'Custom Document Template',
                        description:
                            'Upload your own DOCX template with Mustache placeholders. Download the default template first to see the expected structure, customize it in Word or LibreOffice, then upload it. Your template is stored in browser storage (OPFS) and used for all future document generation.',
                    },
                    {
                        title: 'Session & Plan Data Management',
                        description:
                            'Export, import, or erase Session and Plan records. Useful for backups before a new semester or transferring data between devices.',
                    },
                ],
            },
        ],
    },
]
