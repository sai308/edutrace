<script setup>
import { ref, onMounted, toRaw, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { X, Download, Upload, Trash2, Settings2, Database, Zap, Cog } from 'lucide-vue-next';
import { settingsRepository } from '@/shared/services/settings.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { workspaceRepository } from '@/shared/services/workspace.repository';
import * as statsService from '@/shared/services/stats.service';
import * as backupService from '@/shared/services/backup.service';
import { toast } from '../services/toast';
import { localeService } from '../services/locale';
import { fadeOutAndReload } from '../utils/transition';
import FilterModal from './FilterModal.vue';
import ConfirmModal from './ConfirmModal.vue';
import WorkspaceSelectionModal from './WorkspaceSelectionModal.vue';

const { t, locale } = useI18n();

const props = defineProps({
    isOpen: Boolean
});

const DEFAULT_DURATION_MINUTES_LIMIT = 75;

const emit = defineEmits(['close', 'refresh']);

import { useModalClose } from '../composables/useModalClose';

useModalClose(() => props.isOpen, () => {
    emit('close');
});

// Reset all nested modal states when Settings modal closes
watch(() => props.isOpen, (isOpen) => {
    if (!isOpen) {
        // Reset all nested modals
        showTeachersModal.value = false;
        showEraseConfirm.value = false;
        showEraseReportsConfirm.value = false;
        showEraseGroupsConfirm.value = false;
        showEraseMarksConfirm.value = false;
        showEraseMembersConfirm.value = false;
        showEraseSummaryConfirm.value = false;
        showImportConfirm.value = false;
        showWorkspaceSelection.value = false;
        showWorkspaceSizes.value = false;
    }
});


// Tabs
const activeTab = ref('general');

// Language Settings
const availableLocales = [
    { code: 'en-US', name: 'settings.general.language.en-US' },
    { code: 'uk-UA', name: 'settings.general.language.uk-UA' }
];

function changeLanguage(newLocale) {
    locale.value = newLocale;
    localeService.setLocale(newLocale);
}

// General Settings
const defaultTeacher = ref('');
const durationLimit = ref(DEFAULT_DURATION_MINUTES_LIMIT);
const showTeachersModal = ref(false);
const allStudents = ref([]);
const teacherCount = ref(0);
const configuredTeachers = ref([]);

// Entity Statistics
const entityCounts = ref({
    reports: 0,
    groups: 0,
    marks: 0,
    members: 0,
    finalAssessments: 0,
    modules: 0
});
const globalStats = ref({
    total: 0,
    workspaces: []
});
const currentWorkspaceInfo = ref({
    name: '',
    size: 0
});
const showWorkspaceSizes = ref(false);
const entitySizes = ref({
    reports: 0,
    groups: 0,
    marks: 0,
    tasks: 0,
    members: 0,
    summary: 0
});

onMounted(async () => {
    // ... existing load logic ...
    const students = await studentsRepository.getAll();
    allStudents.value = students.map(s => s.name);
});

// Confirmation Modals
const showEraseConfirm = ref(false);
const showEraseReportsConfirm = ref(false);
const showEraseGroupsConfirm = ref(false);
const showEraseMarksConfirm = ref(false);
const showEraseMembersConfirm = ref(false);
const showEraseSummaryConfirm = ref(false);
const showImportConfirm = ref(false);
const pendingImportData = ref(null);
const pendingImportType = ref(null);

// Workspace Selection
const showWorkspaceSelection = ref(false);
const workspaceSelectionMode = ref('export'); // export, import, erase
const availableWorkspaces = ref([]);
const pendingWorkspaceAction = ref(null); // Function to call after selection
const workspaceSelectionTitle = ref('');
const workspaceSelectionConfirmText = ref('');

// File inputs
const importAllInput = ref(null);
const importReportsInput = ref(null);
const importGroupsInput = ref(null);
const importMarksInput = ref(null);
const importSummaryInput = ref(null);

onMounted(async () => {
    await loadSettings();
});

async function loadSettings() {
    const [ignored, limit, defaultT, students, counts, sizes, globalStatsData] = await Promise.all([
        settingsRepository.getIgnoredUsers(),
        settingsRepository.getDurationLimit(),
        settingsRepository.getDefaultTeacher(),
        studentsRepository.getAllMembers(),
        statsService.getEntityCounts(),
        statsService.getEntitySizes(),
        workspaceRepository.getAllWorkspacesSizes()
    ]);
    defaultTeacher.value = defaultT;
    durationLimit.value = limit;
    const teachers = await settingsRepository.getTeachers(); // Get configured teachers list
    teacherCount.value = teachers.length;
    configuredTeachers.value = teachers;
    entityCounts.value = counts;
    entitySizes.value = sizes;
    globalStats.value = globalStatsData;

    // Calculate current workspace info
    const currentId = workspaceRepository.getCurrentWorkspaceId();
    const workspaces = workspaceRepository.getWorkspaces();
    const currentWs = workspaces.find(w => w.id === currentId);
    currentWorkspaceInfo.value = {
        name: currentWs ? currentWs.name : 'Unknown',
        size: sizes.reports + sizes.groups + sizes.marks + sizes.tasks + sizes.members
    };
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function saveDefaultTeacher() {
    await settingsRepository.saveDefaultTeacher(defaultTeacher.value);
    toast.success(t('toast.defaultTeacherSaved'));
}

async function saveDurationLimit() {
    await settingsRepository.saveDurationLimit(durationLimit.value);
    toast.success(t('toast.durationLimitSaved'));
}

async function applyDurationLimit() {
    const count = await settingsRepository.applyDurationLimitToAll(durationLimit.value);
    toast.success(t('toast.durationLimitApplied', { count }));
    emit('refresh');
}

// Export Functions
async function exportAll() {
    try {
        const workspaces = workspaceRepository.getWorkspaces();
        if (workspaces.length > 1) {
            availableWorkspaces.value = workspaces;
            workspaceSelectionMode.value = 'export';
            workspaceSelectionTitle.value = t('workspaceSelection.title.export');
            workspaceSelectionConfirmText.value = t('common.confirm');
            showWorkspaceSelection.value = true;
            pendingWorkspaceAction.value = async (selectedIds) => {
                try {
                    const data = await backupService.exportWorkspaces(selectedIds);
                    downloadJSON(data, `edutrace-multi-workspace-backup-${getTimestamp()}.json`);
                    toast.success(t('toast.workspacesExported'));
                } catch (e) {
                    console.error('Error exporting workspaces:', e);
                    toast.error(t('toast.workspacesExportFailed'));
                }
            };
        } else {
            // Single workspace export (legacy behavior but using new structure if desired, or keep old)
            // Keeping old behavior for single workspace for now to minimize disruption, 
            // or we can just use the new exportWorkspaces for consistency?
            // User asked to "allow the user, to import/export/delete the chosen workspace, some of them, or all of them"
            // So if there is only 1 workspace, we can just export it directly or show modal.
            // Let's just export directly if only 1, but maybe use the new format?
            // Actually, the request implies extending the functionality.
            // Let's stick to the plan: "Update exportAll to open the selection modal"
            // But if there's only 1 workspace, maybe just export it directly using the legacy method 
            // OR the new method. The legacy method `exportData` exports the *current* workspace data.
            // The new method `exportWorkspaces` exports a wrapper with multiple workspaces.
            // Let's use the new method if the user wants "multi-workspace support".
            // But for backward compatibility or simplicity, if only 1 workspace exists, maybe just do what we did before?
            // Let's show the modal if there are multiple workspaces. If only 1, just do the old export.
            const data = await backupService.exportData();
            downloadJSON(data, `edutrace-backup-${getTimestamp()}.json`);
            toast.success(t('toast.dataExported'));
        }
    } catch (e) {
        console.error('Error exporting data:', e);
        toast.error(t('toast.dataExportFailed'));
    }
}

async function exportReports() {
    try {
        const data = await backupService.exportReports();
        downloadJSON(data, `reports-${getTimestamp()}.json`);
        toast.success(t('toast.reportsExported'));
    } catch (e) {
        console.error('Error exporting reports:', e);
        toast.error(t('toast.reportsExportFailed'));
    }
}

async function exportGroups() {
    try {
        const data = await backupService.exportGroups();
        downloadJSON(data, `groups-${getTimestamp()}.json`);
        toast.success(t('toast.groupsExported'));
    } catch (e) {
        console.error('Error exporting groups:', e);
        toast.error(t('toast.groupsExportFailed'));
    }
}

async function exportMarks() {
    try {
        const data = await backupService.exportMarks();
        downloadJSON(data, `marks-${getTimestamp()}.json`);
        toast.success(t('toast.marksExported'));
    } catch (e) {
        console.error('Error exporting marks:', e);
        toast.error(t('toast.marksExportFailed'));
    }
}

async function exportSummary() {
    try {
        const data = await backupService.exportSummary();
        downloadJSON(data, `summary-${getTimestamp()}.json`);
        toast.success(t('toast.summaryExported'));
    } catch (e) {
        console.error('Error exporting summary:', e);
        toast.error(t('toast.summaryExportFailed'));
    }
}

function downloadJSON(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const uri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
    const link = document.createElement('a');
    link.href = uri;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function getTimestamp() {
    return new Date().toISOString().split('T')[0];
}

// Import Functions
function triggerImportAll() {
    importAllInput.value?.click();
}

function triggerImportReports() {
    importReportsInput.value?.click();
}

function triggerImportGroups() {
    importGroupsInput.value?.click();
}

function triggerImportMarks() {
    importMarksInput.value?.click();
}

function triggerImportSummary() {
    importSummaryInput.value?.click();
}

async function handleImportFile(event, type) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!validateImportData(data, type)) {
            toast.error(t('toast.invalidImportFormat', { type: t(`settings.data.${type}.title`) }));
            event.target.value = '';
            return;
        }

        pendingImportData.value = data;
        pendingImportType.value = type;

        // Only show confirmation for legacy imports that override current workspace data
        // Multi-workspace imports and granular imports don't need confirmation
        if (type === 'all' && !data.type) {
            // Legacy format (no 'type' field means old backup format)
            showImportConfirm.value = true;
        } else {
            // New multi-workspace format or granular import - execute directly
            await executeImport();
        }
    } catch (e) {
        console.error('Error reading import file:', e);
        toast.error(t('toast.invalidJson'));
    }
    event.target.value = '';
}

function validateImportData(data, type) {
    if (!data) return false;

    // Helper to check if array contains items with specific keys
    const hasKeys = (arr, keys) => {
        if (!Array.isArray(arr) || arr.length === 0) return true; // Empty array is valid structure-wise
        const item = arr[0];
        return keys.every(k => k in item);
    };

    if (type === 'reports') {
        const items = Array.isArray(data) ? data : data.meets;
        return Array.isArray(items) && hasKeys(items, ['meetId', 'date']);
    }

    if (type === 'groups') {
        const items = Array.isArray(data) ? data : data.groups;
        return Array.isArray(items) && hasKeys(items, ['name']);
    }

    if (type === 'marks') {
        const items = Array.isArray(data) ? data : data.marks;
        return Array.isArray(items) && hasKeys(items, ['taskId', 'studentId', 'score']);
    }

    if (type === 'summary') {
        return data && data.type === 'summary' && 'finalAssessments' in data && 'modules' in data;
    }

    if (type === 'all') {
        // Multi-workspace backup
        if (data.type === 'multi-workspace-backup' && Array.isArray(data.workspaces)) return true;

        // Legacy full backup
        return 'meets' in data && 'groups' in data && 'marks' in data;
    }

    return false;
}

async function handleWorkspaceSelectionConfirm(selectedIds) {
    showWorkspaceSelection.value = false;
    if (pendingWorkspaceAction.value) {
        await pendingWorkspaceAction.value(selectedIds);
        pendingWorkspaceAction.value = null;
    }
}

async function executeImport() {
    showImportConfirm.value = false;
    try {
        const data = toRaw(pendingImportData.value);
        const type = pendingImportType.value;

        if (type === 'all') {
            if (data.type === 'multi-workspace-backup' && data.workspaces) {
                // Multi-workspace import
                availableWorkspaces.value = data.workspaces;
                workspaceSelectionMode.value = 'import';
                workspaceSelectionTitle.value = t('workspaceSelection.title.import');
                workspaceSelectionConfirmText.value = t('common.confirm');
                showWorkspaceSelection.value = true;
                pendingWorkspaceAction.value = async (selectedIds) => {
                    try {
                        await backupService.importWorkspaces(data, selectedIds);

                        // Switch to the last imported workspace
                        if (selectedIds && selectedIds.length > 0) {
                            const lastWorkspaceId = selectedIds[selectedIds.length - 1];
                            await workspaceRepository.switchWorkspace(lastWorkspaceId);
                        }

                        toast.success(t('toast.workspacesImported'));
                        // Smooth transition before reload
                        fadeOutAndReload(t('loader.loadingWorkspaces'));
                    } catch (e) {
                        console.error('Error importing workspaces:', e);
                        toast.error(t('toast.workspacesImportFailed'));
                    }
                };
            } else {
                // Legacy single workspace import
                await backupService.importData(data);
                toast.success(t('toast.dataImported'));
                await loadSettings();
                emit('refresh');
            }
        } else if (type === 'reports') {
            await backupService.importReports(data);
        } else if (type === 'groups') {
            await backupService.importGroups(data);
        } else if (type === 'marks') {
            await backupService.importMarks(data);
        } else if (type === 'summary') {
            await backupService.importSummary(data);
        }

        if (type !== 'all') {
            toast.success(t('toast.dataImported'));
            await loadSettings(); // Reload counts
            emit('refresh');
        }
    } catch (e) {
        console.error('Error importing data:', e);
        toast.error(t('toast.dataImportFailed') + ': ' + e.message);
    } finally {
        pendingImportData.value = null;
        pendingImportType.value = null;
    }
}

// Erase Functions
async function executeEraseAll() {
    showEraseConfirm.value = false;
    try {
        await backupService.clearAll();
        defaultTeacher.value = '';
        durationLimit.value = DEFAULT_DURATION_MINUTES_LIMIT;
        toast.success(t('toast.allDataErased'));
        await loadSettings(); // Reload counts
        emit('refresh');
    } catch (e) {
        console.error('Error erasing data:', e);
        toast.error(t('toast.dataEraseFailed'));
    }
}

function triggerEraseAll() {
    const workspaces = workspaceRepository.getWorkspaces();
    if (workspaces.length > 1) {
        availableWorkspaces.value = workspaces;
        workspaceSelectionMode.value = 'erase';
        workspaceSelectionTitle.value = t('workspaceSelection.title.erase');
        workspaceSelectionConfirmText.value = t('common.delete');
        showWorkspaceSelection.value = true;
        pendingWorkspaceAction.value = async (selectedIds) => {
            try {
                await workspaceRepository.deleteWorkspacesData(selectedIds);
                toast.success(t('toast.workspacesErased'));
                await loadSettings();
                emit('refresh');
            } catch (e) {
                console.error('Error erasing workspaces:', e);
                toast.error(t('toast.workspacesEraseFailed'));
            }
        };
    } else {
        showEraseConfirm.value = true;
    }
}

async function executeEraseReports() {
    showEraseReportsConfirm.value = false;
    try {
        await backupService.clearReports();
        toast.success(t('toast.reportsErased'));
        await loadSettings(); // Reload counts
        emit('refresh');
    } catch (e) {
        console.error('Error erasing reports:', e);
        toast.error(t('toast.reportsEraseFailed'));
    }
}

async function executeEraseGroups() {
    showEraseGroupsConfirm.value = false;
    try {
        await backupService.clearGroups();
        toast.success(t('toast.groupsErased'));
        await loadSettings(); // Reload counts
        emit('refresh');
    } catch (e) {
        console.error('Error erasing groups:', e);
        toast.error(t('toast.groupsEraseFailed'));
    }
}

async function executeEraseMarks() {
    showEraseMarksConfirm.value = false;
    try {
        await backupService.clearMarks();
        toast.success(t('toast.marksErased'));
        await loadSettings(); // Reload counts
        emit('refresh');
    } catch (e) {
        console.error('Error erasing marks:', e);
        toast.error(t('toast.marksEraseFailed'));
    }
}

async function executeEraseMembers() {
    showEraseMembersConfirm.value = false;
    try {
        await backupService.clearMembers();
        toast.success(t('toast.membersErased'));
        // Reload local state
        const members = await studentsRepository.getAllMembers();
        allStudents.value = members.map(s => s.name);
        await loadSettings(); // Reload counts
        emit('refresh');
    } catch (e) {
        console.error('Error erasing members:', e);
        toast.error(t('toast.membersEraseFailed'));
    }
}

async function executeEraseSummary() {
    showEraseSummaryConfirm.value = false;
    try {
        await backupService.clearFinalAssessments();
        await backupService.clearModules();
        toast.success(t('toast.summaryErased'));
        await loadSettings(); // Reload counts
        emit('refresh');
    } catch (e) {
        console.error('Error erasing summary:', e);
        toast.error(t('toast.summaryEraseFailed'));
    }
}
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div
            class="bg-card w-full max-w-3xl h-[600px] rounded-lg shadow-lg border flex flex-col animate-in zoom-in-95 duration-200">
            <!-- Header -->
            <div class="p-4 border-b flex items-center justify-between flex-shrink-0">
                <h3 class="text-lg font-bold">{{ $t('settings.title') }}</h3>
                <button @click="$emit('close')" class="p-2 hover:bg-muted rounded-full transition-colors">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Desktop Tabs -->
            <div class="border-b flex-shrink-0">
                <div class="hidden md:flex gap-1 p-1 overflow-x-auto no-scrollbar sm:justify-center">
                    <button @click="activeTab = 'general'"
                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors flex-shrink-0 whitespace-nowrap"
                        :class="activeTab === 'general' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'">
                        <Settings2 class="w-4 h-4" />
                        {{ $t('settings.tabs.general') }}
                    </button>
                    <button @click="activeTab = 'data'"
                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors flex-shrink-0 whitespace-nowrap"
                        :class="activeTab === 'data' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'">
                        <Database class="w-4 h-4" />
                        {{ $t('settings.tabs.data') }}
                    </button>
                    <button @click="activeTab = 'advanced'"
                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors flex-shrink-0 whitespace-nowrap"
                        :class="activeTab === 'advanced' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'">
                        <Zap class="w-4 h-4" />
                        {{ $t('settings.tabs.advanced') }}
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6 min-h-0">
                <Transition name="fade" mode="out-in">
                    <!-- General Tab -->
                    <div v-if="activeTab === 'general'" key="general" class="space-y-6">
                        <!-- Language -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium">{{ $t('settings.general.language.label') }}</label>
                            <select v-model="locale" @change="changeLanguage(locale)"
                                class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                                <option v-for="loc in availableLocales" :key="loc.code" :value="loc.code">
                                    {{ $t(loc.name) }}
                                </option>
                            </select>
                            <p class="text-xs text-muted-foreground">{{ $t('settings.general.language.description') }}
                            </p>
                        </div>

                        <!-- Default Teacher -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium">{{ $t('settings.general.defaultTeacher.label') }}</label>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input v-model="defaultTeacher" type="text"
                                    :placeholder="$t('settings.general.defaultTeacher.placeholder')"
                                    list="teachers-list"
                                    class="flex-1 px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                                <datalist id="teachers-list">
                                    <option v-for="teacher in configuredTeachers" :key="teacher" :value="teacher" />
                                </datalist>
                                <button @click="saveDefaultTeacher"
                                    class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">
                                    {{ $t('settings.general.defaultTeacher.save') }}
                                </button>
                            </div>
                            <p class="text-xs text-muted-foreground">{{
                                $t('settings.general.defaultTeacher.description') }}</p>
                        </div>

                        <!-- Duration Limit -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium">{{ $t('settings.general.durationLimit.label') }}</label>
                            <div class="flex flex-col gap-2">
                                <input v-model.number="durationLimit" type="number" min="0"
                                    :placeholder="$t('settings.general.durationLimit.placeholder')"
                                    class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                                <div class="flex flex-col sm:flex-row gap-2">
                                    <button @click="saveDurationLimit"
                                        class="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">
                                        {{ $t('settings.general.durationLimit.save') }}
                                    </button>
                                    <button @click="applyDurationLimit"
                                        class="flex-1 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors">
                                        {{ $t('settings.general.durationLimit.applyToAll') }}
                                    </button>
                                </div>
                            </div>
                            <p class="text-xs text-muted-foreground">{{ $t('settings.general.durationLimit.description')
                                }}</p>
                        </div>

                        <!-- Teachers -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium">{{ $t('settings.general.teachers.label') }}</label>
                            <button @click="showTeachersModal = true"
                                class="w-full px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors flex items-center justify-between">
                                <span>{{ $t('settings.general.teachers.manage') }}</span>
                                <span v-if="teacherCount > 0"
                                    class="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                    {{ teacherCount }}
                                </span>
                            </button>
                            <p class="text-xs text-muted-foreground">{{ $t('settings.general.teachers.description') }}
                            </p>
                        </div>
                    </div>

                    <!-- Data Management Tab -->
                    <div v-else-if="activeTab === 'data'" key="data" class="space-y-4">
                        <!-- Current Workspace Info -->
                        <div class="bg-muted/20 border rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <h4 class="font-medium text-sm">{{ $t('settings.data.currentWorkspace') }}</h4>
                                <p class="text-lg font-bold">{{ currentWorkspaceInfo.name }}</p>
                            </div>
                            <div class="text-right">
                                <h4 class="font-medium text-sm">{{ $t('settings.data.totalSize') }}</h4>
                                <p class="text-lg font-mono">{{ formatBytes(currentWorkspaceInfo.size) }}</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Reports Card -->
                            <div class="border rounded-lg p-4 space-y-3">
                                <div class="flex items-center justify-between">
                                    <h4 class="font-medium">{{ $t('settings.data.reports.title') }}</h4>
                                    <span v-if="entityCounts.reports > 0"
                                        class="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                        {{ entityCounts.reports }}
                                    </span>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <button @click="exportReports"
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                                        <Download class="w-4 h-4" />
                                        {{ $t('settings.data.actions.export') }}
                                    </button>
                                    <button @click="triggerImportReports"
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                                        <Upload class="w-4 h-4" />
                                        {{ $t('settings.data.actions.import') }}
                                    </button>
                                    <div class="flex gap-4 items-center">
                                        <button @click="showEraseReportsConfirm = true"
                                            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-md hover:bg-destructive/10 transition-colors">
                                            <Trash2 class="w-4 h-4" />
                                            {{ $t('settings.data.actions.erase') }}
                                        </button>
                                        <p v-if="entitySizes.reports > 0" class="text-xs text-muted-foreground">
                                            {{ $t('settings.data.reports.memory') }}: {{
                                                formatBytes(entitySizes.reports) }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Groups Card -->
                            <div class="border rounded-lg p-4 space-y-3">
                                <div class="flex items-center justify-between">
                                    <h4 class="font-medium">{{ $t('settings.data.groups.title') }}</h4>
                                    <span v-if="entityCounts.groups > 0"
                                        class="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                        {{ entityCounts.groups }}
                                    </span>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <button @click="exportGroups"
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                                        <Download class="w-4 h-4" />
                                        {{ $t('settings.data.actions.export') }}
                                    </button>
                                    <button @click="triggerImportGroups"
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                                        <Upload class="w-4 h-4" />
                                        {{ $t('settings.data.actions.import') }}
                                    </button>
                                    <div class="flex gap-4 items-center">
                                        <button @click="showEraseGroupsConfirm = true"
                                            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-md hover:bg-destructive/10 transition-colors">
                                            <Trash2 class="w-4 h-4" />
                                            {{ $t('settings.data.actions.erase') }}
                                        </button>
                                        <p v-if="entitySizes.groups > 0" class="text-xs text-muted-foreground">
                                            {{ $t('settings.data.groups.memory') }}: {{ formatBytes(entitySizes.groups)
                                            }}
                                        </p>
                                    </div>
                                </div>

                            </div>

                            <!-- Marks Card -->
                            <div class="border rounded-lg p-4 space-y-3">
                                <div class="flex items-center justify-between">
                                    <h4 class="font-medium">{{ $t('settings.data.marks.title') }}</h4>
                                    <span v-if="entityCounts.marks > 0"
                                        class="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                        {{ entityCounts.marks }}
                                    </span>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <button @click="exportMarks"
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                                        <Download class="w-4 h-4" />
                                        {{ $t('settings.data.actions.export') }}
                                    </button>
                                    <button @click="triggerImportMarks"
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                                        <Upload class="w-4 h-4" />
                                        {{ $t('settings.data.actions.import') }}
                                    </button>
                                    <div class="flex gap-4 items-center">

                                        <button @click="showEraseMarksConfirm = true"
                                            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-md hover:bg-destructive/10 transition-colors">
                                            <Trash2 class="w-4 h-4" />
                                            {{ $t('settings.data.actions.erase') }}
                                        </button>
                                        <p v-if="entitySizes.marks > 0" class="text-xs text-muted-foreground">
                                            {{ $t('settings.data.marks.memory') }}: {{ formatBytes(entitySizes.marks) }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Tasks Card -->
                            <div class="border rounded-lg p-4 space-y-3">
                                <div class="flex items-center justify-between">
                                    <h4 class="font-medium">{{ $t('settings.data.tasks.title') }}</h4>
                                    <span v-if="entityCounts.tasks > 0"
                                        class="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                        {{ entityCounts.tasks }}
                                    </span>
                                </div>
                                <div class="flex gap-4 items-center">
                                    <button disabled
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-md opacity-50 cursor-not-allowed transition-colors"
                                        :title="$t('settings.data.actions.eraseDisabled')">
                                        <Trash2 class="w-4 h-4" />
                                        {{ $t('settings.data.actions.erase') }}
                                    </button>
                                    <p v-if="entitySizes.tasks > 0" class="text-xs text-muted-foreground">
                                        {{ $t('settings.data.tasks.memory') }}: {{ formatBytes(entitySizes.tasks) }}
                                    </p>
                                </div>
                            </div>

                            <!-- Members Card -->
                            <div class="border rounded-lg p-4 space-y-3">
                                <div class="flex items-center justify-between">
                                    <h4 class="font-medium">{{ $t('settings.data.members.title') }}</h4>
                                    <span v-if="entityCounts.members > 0"
                                        class="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                        {{ entityCounts.members }}
                                    </span>
                                </div>
                                <div class="flex gap-4 items-center">
                                    <button @click="showEraseMembersConfirm = true"
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-md hover:bg-destructive/10 transition-colors">
                                        <Trash2 class="w-4 h-4" />
                                        {{ $t('settings.data.actions.erase') }}
                                    </button>
                                    <p v-if="entitySizes.members > 0" class="text-xs text-muted-foreground">
                                        {{ $t('settings.data.members.memory') }}: {{ formatBytes(entitySizes.members) }}
                                    </p>
                                </div>
                            </div>

                            <!-- Summary Card -->
                            <div class="border rounded-lg p-4 space-y-3">
                                <div class="flex items-center justify-between">
                                    <h4 class="font-medium">{{ $t('settings.data.summary.title') }}</h4>
                                    <span v-if="(entityCounts.finalAssessments + entityCounts.modules) > 0"
                                        class="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                        {{ entityCounts.finalAssessments + entityCounts.modules }}
                                    </span>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <button @click="exportSummary"
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                                        <Download class="w-4 h-4" />
                                        {{ $t('settings.data.actions.export') }}
                                    </button>
                                    <button @click="triggerImportSummary"
                                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                                        <Upload class="w-4 h-4" />
                                        {{ $t('settings.data.actions.import') }}
                                    </button>
                                    <div class="flex gap-4 items-center">
                                        <button @click="showEraseSummaryConfirm = true"
                                            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-md hover:bg-destructive/10 transition-colors">
                                            <Trash2 class="w-4 h-4" />
                                            {{ $t('settings.data.actions.erase') }}
                                        </button>
                                        <p v-if="entitySizes.summary > 0" class="text-xs text-muted-foreground">
                                            {{ $t('settings.data.summary.memory') }}: {{
                                                formatBytes(entitySizes.summary) }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Advanced Tab -->
                    <div v-else-if="activeTab === 'advanced'" key="advanced" class="space-y-6">
                        <!-- Global Operations -->
                        <div class="border rounded-lg p-4 space-y-3">
                            <h4 class="font-medium">{{ $t('settings.advanced.global.title') }}</h4>
                            <p class="text-sm text-muted-foreground">{{ $t('settings.advanced.global.description.title')
                            }}<br>{{ $t('settings.advanced.global.description.list')
                                }}
                            </p>

                            <div v-if="globalStats.total > 0"
                                class="flex items-center gap-2 text-xs text-muted-foreground">
                                <p v-if="entityCounts.reports + entityCounts.groups + entityCounts.marks + entityCounts.members > 0"
                                    class="text-xs text-muted-foreground">
                                    {{ $t('settings.advanced.global.totalRecords') }}: {{ entityCounts.reports +
                                        entityCounts.groups + entityCounts.marks +
                                        entityCounts.members }}
                                    <template v-if="globalStats.total > 0">
                                        <span>{{ $t('settings.advanced.global.totalSize') }}: {{
                                            formatBytes(globalStats.total)
                                        }}</span>
                                        <button @click="showWorkspaceSizes = !showWorkspaceSizes"
                                            class="ml-4 text-primary hover:underline">
                                            {{ showWorkspaceSizes ? $t('settings.advanced.global.hideDetails') :
                                                $t('settings.advanced.global.showDetails') }}
                                        </button>
                                    </template>
                                </p>
                            </div>
                            <div v-if="showWorkspaceSizes"
                                class="border rounded-md p-2 bg-muted/30 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                <div v-for="ws in globalStats.workspaces" :key="ws.id"
                                    class="flex justify-between text-xs">
                                    <span>{{ ws.name }}</span>
                                    <span class="font-mono">{{ formatBytes(ws.size) }}</span>
                                </div>
                            </div>

                            <div class="flex flex-wrap gap-2 pt-2">
                                <button @click="exportAll"
                                    class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">
                                    <Download class="w-4 h-4" />
                                    {{ $t('settings.advanced.global.exportAll') }}
                                </button>
                                <button @click="triggerImportAll"
                                    class="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                                    <Upload class="w-4 h-4" />
                                    {{ $t('settings.advanced.global.importAll') }}
                                </button>
                                <button @click="triggerEraseAll"
                                    class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive border border-destructive rounded-md hover:bg-destructive/10 transition-colors">
                                    <Trash2 class="w-4 h-4" />
                                    {{ $t('settings.advanced.global.eraseAll') }}
                                </button>
                            </div>
                        </div>

                        <!-- Sync (Coming Soon) -->
                        <div class="border border-dashed rounded-lg p-4 space-y-3 opacity-60">
                            <div class="flex items-center gap-2">
                                <h4 class="font-medium">{{ $t('settings.advanced.sync.title') }}</h4>
                                <span class="text-xs bg-muted px-2 py-0.5 rounded-full">{{
                                    $t('settings.advanced.sync.comingSoon') }}</span>
                            </div>
                            <p class="text-sm text-muted-foreground">
                                {{ $t('settings.advanced.sync.description') }}
                            </p>
                            <div class="flex gap-2">
                                <button disabled
                                    class="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md opacity-50 cursor-not-allowed">
                                    <Cog class="w-4 h-4" />
                                    {{ $t('settings.advanced.sync.configure') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>


            <!-- Footer with Navigation (Mobile only) -->
            <nav class="md:hidden border-t bg-muted/10 flex-shrink-0">
                <div class="flex items-center justify-around h-16">
                    <button @click="activeTab = 'general'"
                        class="flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-colors"
                        :class="activeTab === 'general' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'">
                        <Settings2 class="w-5 h-5" />
                        <span>{{ $t('settings.tabs.general') }}</span>
                    </button>
                    <button @click="activeTab = 'data'"
                        class="flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-colors"
                        :class="activeTab === 'data' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'">
                        <Database class="w-5 h-5" />
                        <span>{{ $t('settings.tabs.data') }}</span>
                    </button>
                    <button @click="activeTab = 'advanced'"
                        class="flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-colors"
                        :class="activeTab === 'advanced' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'">
                        <Zap class="w-5 h-5" />
                        <span>{{ $t('settings.tabs.advanced') }}</span>
                    </button>
                </div>
            </nav>
        </div>

        <!-- Hidden File Inputs -->
        <input ref="importAllInput" type="file" accept=".json" @change="handleImportFile($event, 'all')"
            class="hidden" />
        <input ref="importReportsInput" type="file" accept=".json" @change="handleImportFile($event, 'reports')"
            class="hidden" />
        <input ref="importGroupsInput" type="file" accept=".json" @change="handleImportFile($event, 'groups')"
            class="hidden" />
        <input ref="importMarksInput" type="file" accept=".json" class="hidden"
            @change="(e) => handleImportFile(e, 'marks')" />
        <input ref="importSummaryInput" type="file" accept=".json" class="hidden"
            @change="(e) => handleImportFile(e, 'summary')" />

        <!-- Filter Modal -->
        <FilterModal :is-open="showTeachersModal" :all-users="allStudents" mode="teachers"
            @close="showTeachersModal = false" @update:items="(items) => teacherCount = items.length" />

        <!-- Confirmation Modals -->
        <ConfirmModal :is-open="showImportConfirm" :title="$t('confirm.import.title')"
            :message="$t('confirm.import.message')" :confirm-text="$t('confirm.import.confirm')"
            @cancel="showImportConfirm = false" @confirm="executeImport" />

        <ConfirmModal :is-open="showEraseConfirm" :title="$t('confirm.eraseAll.title')"
            :message="$t('confirm.eraseAll.message')" :confirm-text="$t('confirm.eraseAll.confirm')"
            @cancel="showEraseConfirm = false" @confirm="executeEraseAll" />

        <ConfirmModal :is-open="showEraseReportsConfirm" :title="$t('confirm.eraseReports.title')"
            :message="$t('confirm.eraseReports.message')" :confirm-text="$t('confirm.eraseReports.confirm')"
            @cancel="showEraseReportsConfirm = false" @confirm="executeEraseReports" />

        <ConfirmModal :is-open="showEraseGroupsConfirm" :title="$t('confirm.eraseGroups.title')"
            :message="$t('confirm.eraseGroups.message')" :confirm-text="$t('confirm.eraseGroups.confirm')"
            @cancel="showEraseGroupsConfirm = false" @confirm="executeEraseGroups" />

        <ConfirmModal :is-open="showEraseMarksConfirm" :title="$t('confirm.eraseMarks.title')"
            :message="$t('confirm.eraseMarks.message')" :confirm-text="$t('confirm.eraseMarks.confirm')"
            @cancel="showEraseMarksConfirm = false" @confirm="executeEraseMarks" />

        <ConfirmModal :is-open="showEraseMembersConfirm" :title="$t('confirm.eraseMembers.title')"
            :message="$t('confirm.eraseMembers.message')" :confirm-text="$t('confirm.eraseMembers.confirm')"
            @cancel="showEraseMembersConfirm = false" @confirm="executeEraseMembers" />

        <ConfirmModal :is-open="showEraseSummaryConfirm" :title="$t('confirm.eraseSummary.title')"
            :message="$t('confirm.eraseSummary.message')" :confirm-text="$t('confirm.eraseSummary.confirm')"
            @cancel="showEraseSummaryConfirm = false" @confirm="executeEraseSummary" />

        <!-- Workspace Selection Modal -->
        <WorkspaceSelectionModal :is-open="showWorkspaceSelection" :workspaces="availableWorkspaces"
            :mode="workspaceSelectionMode" :title="workspaceSelectionTitle"
            :confirm-text="workspaceSelectionConfirmText" @close="showWorkspaceSelection = false"
            @confirm="handleWorkspaceSelectionConfirm" />
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
