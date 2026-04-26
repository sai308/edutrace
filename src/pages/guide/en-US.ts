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
            'Welcome to the EduTrace application. This guide will help you understand how to use the various features of the app to manage your students, groups, and marks efficiently.',
        details: [
            {
                title: 'What makes EduTrace different',
                items: [
                    {
                        title: 'Your Data Stays on Your Device',
                        description:
                            'EduTrace is a "local-first" application, which means all your data (attendance reports, marks, groups, student information) is stored directly in your web browser on your device, not on external servers.',
                    },
                    {
                        title: 'Privacy by Design',
                        description:
                            'Because your data never leaves your device, you have complete control and privacy. No one else can access your information unless you explicitly share it.',
                    },
                    {
                        title: 'Works Offline',
                        description:
                            'Once loaded, EduTrace works without an internet connection. You can view reports, add marks, and manage groups even when offline.',
                    },
                    {
                        title: 'No Account Required',
                        description:
                            "There's no need to create an account, remember passwords, or worry about subscription fees. Just open the app and start using it.",
                    },
                    {
                        title: 'Fast and Responsive',
                        description:
                            'Since everything runs locally on your device, the app is extremely fast with instant updates and no loading delays.',
                    },
                ],
            },
            {
                title: 'Important things to know',
                items: [
                    {
                        title: 'Browser-Specific Data',
                        description:
                            "Your data is stored in your browser's local storage. This means if you use EduTrace in Chrome, your data won't automatically appear in Firefox or Safari. Each browser keeps its own separate data.",
                    },
                    {
                        title: 'Device-Specific Data',
                        description:
                            "Similarly, data on your laptop won't automatically sync to your phone or tablet. Each device maintains its own independent copy.",
                    },
                    {
                        title: 'Backup Regularly',
                        description:
                            "Since data is stored locally, it's important to regularly export your data (via Settings → Advanced → Export All) to create backups. If you clear your browser data or uninstall the browser, your EduTrace data will be lost.",
                    },
                    {
                        title: 'Sharing Between Devices',
                        description:
                            'To use EduTrace on multiple devices, export your data from one device and import it on another using the Settings menu.',
                    },
                    {
                        title: 'Browser Storage Limits',
                        description:
                            'Browsers have storage limits (typically several hundred MB). While this is more than enough for most use cases, be aware that extremely large datasets might approach these limits.',
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
            'The Reports page is your landing page. Here you can see a list of all your uploaded Google Meet reports. You can filter them by date, group, or meet ID. Click on a report to view detailed attendance information.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Upload Reports',
                        description:
                            'Drag and drop your Google Meet attendance CSV files into the designated drop zone at the top of the page.',
                    },
                    {
                        title: 'Search & Filter',
                        description:
                            'Use the search bar to find specific meets. Click on "Group" or "Meet ID" chips within the table to activate quick filters.',
                    },
                    {
                        title: 'Sort Data',
                        description:
                            'Click on any column header (Group, Meet ID, Date, etc.) to sort the table accordingly.',
                    },
                    {
                        title: 'Manage Reports',
                        description:
                            'Use the checkboxes to select multiple reports for bulk deletion, or use the trash icon on each row to delete individually.',
                    },
                    {
                        title: 'View Details',
                        description:
                            'Click the eye icon on any row to open the detailed view, where you can analyze participant duration and timelines.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Centralized History',
                        description: 'A complete history of all your uploaded attendance reports in one place.',
                    },
                    {
                        title: 'Quick Insights',
                        description: 'Immediate visibility into participant counts and session dates.',
                    },
                    {
                        title: 'Organization',
                        description:
                            'Automatic mapping of Meet IDs to Groups (once groups are configured), helping you keep your records organized.',
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
            'The Analytics page provides a visual overview of attendance trends. You can see charts and graphs representing attendance over time, by group, or by course. This helps in identifying patterns and issues early.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Dashboard Overview',
                        description:
                            'The dashboard groups your meets by course (1st, 2nd, 3rd, 4th) and "Other Meets". Click on a course section to expand or collapse it.',
                    },
                    {
                        title: 'Search',
                        description: 'Use the search bar to quickly find specific meets by name, teacher, or ID.',
                    },
                    {
                        title: 'Quick Stats',
                        description:
                            'Each card displays key metrics: Total Sessions, Average Duration, and Participant Count (Active/Total).',
                    },
                    {
                        title: 'Attendance Health',
                        description:
                            'Color-coded badges (Green > 75%, Yellow > 50%, Red < 50%) give you an instant visual indicator of attendance performance.',
                    },
                    {
                        title: 'QR Code',
                        description:
                            'Click the QR code icon on any card to generate a shareable link for that specific meet.',
                    },
                    {
                        title: 'Detailed View',
                        description:
                            'Click on any card to dive deeper into the analytics for that specific meet, including attendance graphs and student-specific data.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Trend Analysis',
                        description: 'Spot attendance trends across different courses and groups.',
                    },
                    {
                        title: 'Performance Metrics',
                        description: 'Easily identify high-performing groups and those that may need attention.',
                    },
                    {
                        title: 'Efficient Navigation',
                        description: 'Quickly jump to detailed reports for specific meets directly from the dashboard.',
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
            'The Groups page allows you to manage your student groups. You can see which students belong to which group, and manage their details. This is essential for accurate attendance tracking.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Create Groups',
                        description:
                            'Click the "Add Group" button to create a new group. Enter the group name, course number (1-4), Meet ID (the unique code from Google Meet), and optionally assign a teacher.',
                    },
                    {
                        title: 'Search & Filter',
                        description: 'Use the search bar to quickly find groups by name or Meet ID.',
                    },
                    {
                        title: 'Sort Data',
                        description:
                            'Click on any column header (Name, Course, Meet ID, Members, Teacher) to sort the table. Click again to reverse the sort order.',
                    },
                    {
                        title: 'Edit Groups',
                        description:
                            'Click the edit icon (pencil) on any row to modify group details such as name, course, Meet ID, or teacher assignment.',
                    },
                    {
                        title: 'Generate QR Codes',
                        description:
                            "Click the QR code icon to generate a shareable QR code for the group's Meet ID, making it easy for students to join sessions.",
                    },
                    {
                        title: 'Delete Groups',
                        description:
                            "Use the trash icon to remove groups that are no longer needed. You'll be asked to confirm before deletion.",
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Organized Structure',
                        description:
                            'Map Google Meet IDs to meaningful group names and course numbers for better organization.',
                    },
                    {
                        title: 'Member Tracking',
                        description: 'See at a glance how many students are assigned to each group.',
                    },
                    {
                        title: 'Teacher Assignment',
                        description: 'Associate teachers with groups for better record-keeping and filtering.',
                    },
                    {
                        title: 'Automatic Integration',
                        description:
                            'Once groups are configured, uploaded attendance reports are automatically linked to the correct groups, making analytics more meaningful.',
                    },
                    {
                        title: 'Easy Sharing',
                        description:
                            'Generate QR codes for quick access to meeting links, perfect for sharing with students.',
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
            'The Students page lists all the students in your system. You can search for specific students, view their attendance history, and manage their information.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Search Students',
                        description:
                            'Use the search bar to find students by name, group, or Meet ID. The search is instant and filters results as you type.',
                    },
                    {
                        title: 'Filter by Group',
                        description:
                            'Click on any group chip in the "Groups" column to filter the table to show only students from that group. Click the X button to clear the filter.',
                    },
                    {
                        title: 'Sort Data',
                        description:
                            'Click on any column header to sort the table. Available sort options include name, groups, sessions, attendance percentages, average marks, and task completion.',
                    },
                    {
                        title: 'View Analytics',
                        description:
                            'Click on any Meet ID chip to navigate directly to the detailed analytics view for that specific meet.',
                    },
                    {
                        title: 'Bulk Selection',
                        description:
                            'Use the checkboxes to select multiple students. Select all by clicking the header checkbox. Bulk delete selected students using the "Delete" button that appears.',
                    },
                    {
                        title: 'Edit Students',
                        description:
                            'Click the edit icon (pencil) to modify student information such as name, email, or group assignments.',
                    },
                    {
                        title: 'Track Attendance',
                        description:
                            'View attendance statistics including sessions attended (e.g., 7/8), average attendance percentage per session, and total attendance percentage.',
                    },
                    {
                        title: 'Monitor Performance',
                        description:
                            'See average marks (5-point scale) and task completion percentages at a glance, with color-coded indicators (green > 75%, yellow > 50%, red < 50%).',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Comprehensive Overview',
                        description:
                            'All student data in one place, including attendance, marks, and task completion statistics.',
                    },
                    {
                        title: 'Multi-Dimensional Tracking',
                        description: 'Track students across multiple groups and Meet IDs simultaneously.',
                    },
                    {
                        title: 'Performance Insights',
                        description:
                            'Color-coded visual indicators help you quickly identify students who may need additional support.',
                    },
                    {
                        title: 'Attendance Analytics',
                        description:
                            'Detailed attendance metrics showing both average per-session attendance and total attendance across all sessions.',
                    },
                    {
                        title: 'Academic Progress',
                        description:
                            'View average marks and task completion rates to monitor academic performance alongside attendance.',
                    },
                    {
                        title: 'Flexible Management',
                        description:
                            'Edit student details, manage group assignments, and perform bulk operations efficiently.',
                    },
                    {
                        title: 'Teacher Exclusion',
                        description:
                            'Teachers are automatically filtered out from the student list based on your settings, keeping the view focused on students only.',
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
            'The Marks page is where you can record and view student grades. You can assign marks for different activities and view a summary of performance.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Upload Marks',
                        description:
                            'Drag and drop CSV files containing marks data. Files should be named with the group prefix (e.g., "CS-101_marks.csv"). If the group doesn\'t exist, you\'ll be prompted to create it.',
                    },
                    {
                        title: 'Grade Scale Selector',
                        description:
                            'Choose how to display marks using the dropdown: Default (raw scores), 5-Point scale, 100-Point scale, or ECTS grades. The conversion is automatic.',
                    },
                    {
                        title: 'Search & Filter',
                        description:
                            'Use the search bar to find marks by student name, group, or task name. Click the "Filters" button for advanced filtering by sync status, date range, or specific group.',
                    },
                    {
                        title: 'Sort Data',
                        description:
                            'Click on column headers (Added, Student, Group, Task) to sort the table. Marks are sorted by creation date (newest first) by default.',
                    },
                    {
                        title: 'Sync Status',
                        description:
                            'Mark entries as "synced" (checkmark icon) once you\'ve recorded them in your official gradebook. Unsynced marks show an orange pulsing dot and are filtered by default.',
                    },
                    {
                        title: 'Bulk Operations',
                        description:
                            'Select multiple marks using checkboxes and delete them in bulk. Use the select-all checkbox in the header for quick selection.',
                    },
                    {
                        title: 'Group Filtering',
                        description:
                            'Click on any group chip to instantly filter marks to show only that group. The active filter is highlighted with a ring.',
                    },
                    {
                        title: 'View Details',
                        description:
                            'Hover over any mark to see a tooltip with the full breakdown: raw score, percentage, 5-point scale, 100-point scale, and ECTS grade.',
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Flexible Grading',
                        description:
                            'Support for multiple grading systems (5-point, 100-point, ECTS) with automatic conversion from raw scores.',
                    },
                    {
                        title: 'Task Management',
                        description:
                            'Track marks for different tasks and assignments, with task names and dates clearly displayed.',
                    },
                    {
                        title: 'Sync Tracking',
                        description:
                            'Keep track of which marks have been officially recorded with the sync status feature, preventing duplicate entries.',
                    },
                    {
                        title: 'Comprehensive Search',
                        description:
                            'Find specific marks quickly by searching across students, groups, and task names simultaneously.',
                    },
                    {
                        title: 'Advanced Filtering',
                        description:
                            'Filter by sync status (unsynced/all), date range, or specific groups to focus on what matters.',
                    },
                    {
                        title: 'Automatic Integration',
                        description:
                            'Marks are automatically linked to students and groups, appearing in student profiles and analytics.',
                    },
                    {
                        title: 'Visual Clarity',
                        description:
                            'Color-coded marks and clear visual indicators (sync dots, tooltips) make it easy to understand the data at a glance.',
                    },
                    {
                        title: 'Bulk Management',
                        description:
                            'Efficiently manage large numbers of marks with bulk selection and deletion capabilities.',
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
            'The Settings modal allows you to configure the application to your needs. You can manage data, set preferences, and customize the application behavior.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'General Tab — Language',
                        description:
                            'Select your preferred language (English or Ukrainian). The entire interface will update immediately to reflect your choice.',
                    },
                    {
                        title: 'General Tab — Default Teacher',
                        description:
                            'Set a default teacher name that will be pre-filled when creating new groups, saving you time on repetitive data entry.',
                    },
                    {
                        title: 'General Tab — Duration Limit',
                        description:
                            'Set the maximum session duration (in minutes) for attendance tracking. Default is 75 minutes. Use "Apply to All" to update all existing meets with this limit.',
                    },
                    {
                        title: 'General Tab — Teachers',
                        description:
                            'Click "Manage Teachers" to open a modal where you can select which participants should be excluded from student lists and statistics.',
                    },
                    {
                        title: 'Data Management Tab',
                        description:
                            'Manage your data by entity type (Reports, Groups, Marks, Members). Each card shows the record count and memory usage, with options to Export, Import, or Erase.',
                    },
                    {
                        title: 'Advanced Tab — Global Operations',
                        description:
                            'Perform operations on all data at once. Export All creates a complete backup, Import All restores from backup, and Erase All permanently deletes everything.',
                    },
                    {
                        title: 'Data Backup Strategy',
                        description:
                            'Regularly export your data to create backups. Use entity-specific exports for targeted backups or "Export All" for complete system backups.',
                    },
                    {
                        title: 'Import Data',
                        description:
                            "When importing, you'll be asked to confirm as it will replace existing data. Make sure you have a backup before importing.",
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Multi-Language Support',
                        description:
                            'Switch between English and Ukrainian with instant UI updates, making the app accessible to diverse users.',
                    },
                    {
                        title: 'Customizable Defaults',
                        description:
                            'Set default values for teacher names and session durations to streamline your workflow.',
                    },
                    {
                        title: 'Teacher Filtering',
                        description:
                            'Automatically exclude teachers from student lists and statistics, keeping your data focused on actual students.',
                    },
                    {
                        title: 'Data Portability',
                        description:
                            'Export and import data in JSON format, enabling easy backups, data migration, and sharing between devices.',
                    },
                    {
                        title: 'Granular Control',
                        description:
                            'Manage each data type (Reports, Groups, Marks, Members) independently or perform global operations on everything at once.',
                    },
                    {
                        title: 'Storage Insights',
                        description:
                            'See exactly how many records you have and how much storage each entity type is using.',
                    },
                    {
                        title: 'Safe Data Management',
                        description:
                            'All destructive operations (erase, import) require confirmation to prevent accidental data loss.',
                    },
                    {
                        title: 'Flexible Duration Control',
                        description:
                            'Adjust attendance duration limits globally or per-session to match your specific needs (e.g., different class lengths).',
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
            'Workspaces allow you to organize your data into separate, isolated environments. Each workspace has its own set of reports, groups, students, marks, and settings, making it perfect for managing different semesters, courses, or academic years.',
        details: [
            {
                title: 'How to use',
                items: [
                    {
                        title: 'Create Workspace',
                        description:
                            'Click the workspace switcher in the top-left corner, then click "Create New Workspace". Enter a name (e.g., "Fall 2024"), select an icon and color, and choose whether to copy your current settings.',
                    },
                    {
                        title: 'Switch Workspaces',
                        description:
                            'Click the workspace switcher to see all your workspaces. Click on any workspace to switch to it. The currently active workspace is highlighted with a checkmark.',
                    },
                    {
                        title: 'Icon & Color',
                        description:
                            'Choose from available icons and a custom color to visually distinguish your workspaces. The color propagates through the app UI as an accent.',
                    },
                    {
                        title: 'Copy Settings',
                        description:
                            "When creating a new workspace, you can optionally copy your current workspace's settings (duration limit, default teacher, ignored users).",
                    },
                    {
                        title: 'Delete Workspace',
                        description:
                            "Hover over a workspace in the switcher and click the trash icon. You'll need to type the workspace name to confirm deletion. The default workspace cannot be deleted.",
                    },
                ],
            },
            {
                title: 'What you get',
                items: [
                    {
                        title: 'Complete Data Isolation',
                        description:
                            "Each workspace maintains completely separate data. Reports, groups, students, and marks in one workspace don't affect or appear in another.",
                    },
                    {
                        title: 'Settings Isolation',
                        description:
                            "Each workspace has its own settings for duration limits, default teacher, and ignored users. Changes in one workspace don't affect others.",
                    },
                    {
                        title: 'Multi-Semester Management',
                        description:
                            'Create separate workspaces for different semesters or academic years (e.g., "Fall 2024", "Spring 2025") to keep historical data organized.',
                    },
                    {
                        title: 'Course Segregation',
                        description:
                            'Use workspaces to separate different types of courses or programs you teach, preventing data mixing.',
                    },
                    {
                        title: 'Clean Start',
                        description:
                            'Start each new semester with a fresh workspace while preserving all historical data in previous workspaces.',
                    },
                    {
                        title: 'Visual Identification',
                        description:
                            "Custom icons and colors make it easy to identify which workspace you're currently working in at a glance.",
                    },
                    {
                        title: 'Flexible Organization',
                        description:
                            'Organize your teaching data however makes sense for you — by semester, year, course type, or any other criteria.',
                    },
                    {
                        title: 'Easy Access',
                        description:
                            'The workspace switcher is always accessible from the sidebar header, making it quick to switch contexts.',
                    },
                ],
            },
        ],
    },
]
