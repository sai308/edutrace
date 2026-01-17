<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMeets } from '@Analytics/composables/useMeets'
import { useReportProcessing } from '../composables/useReportProcessing'
import DropZone from '@/components/DropZone.vue'

// Import the new TanStack-based component
import ReportsListDataTable from '../components/ReportsList/DataTable.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from "@/components/ui/badge"
import DataTableViewOptions from '@/components/DataTableViewOptions.vue'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Trash2, Plus } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const { meets, groupsMap, loadMeets, deleteMeet, bulkDeleteMeets } = useMeets()
const { isProcessing, handleFilesDropped, showFilterModal, processFiles, cancelFilter } = useReportProcessing()

const showDeleteConfirm = ref(false)
const meetToDeleteId = ref<string | null>(null)
const searchQuery = ref('')
const reportsTableRef = ref()
const showUploadModal = ref(false)

onMounted(() => loadMeets())


const handleDeleteMeet = (id: string) => {
    meetToDeleteId.value = id
    showDeleteConfirm.value = true
}

const executeDelete = async () => {
    if (meetToDeleteId.value) {
        await deleteMeet(meetToDeleteId.value)
        showDeleteConfirm.value = false
        meetToDeleteId.value = null
    }
}

const handleViewDetails = (id: string) => {
    router.push({ name: 'ReportDetails', params: { id } })
}
</script>

<template>
    <div class="container py-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div class="grid gap-6">
            <Card>
                <CardHeader class="flex flex-row items-baseline justify-between py-4 space-y-0">
                    <div class="flex items-center gap-4">
                        <CardTitle class="text-2xl font-bold tracking-tight">Reports</CardTitle>
                        <div class="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            {{ reportsTableRef?.table?.getFilteredRowModel().rows.length || 0 }} of {{ meets.length }}
                            reports
                        </div>
                        <Button v-if="reportsTableRef?.table?.getFilteredSelectedRowModel().rows.length > 0"
                            variant="destructive" size="sm"
                            class="h-8 gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none shadow-sm"
                            @click="bulkDeleteMeets(reportsTableRef?.table?.getFilteredSelectedRowModel().rows.map((r: any) => r.original.id))">
                            <Trash2 class="h-3.5 w-3.5" />
                            <span class="font-semibold uppercase text-[10px] tracking-wider">Видалити</span>
                            <Badge
                                class="h-5 min-w-[20px] px-1 bg-white text-destructive border-none rounded-full text-[10px] font-bold flex items-center justify-center">
                                {{ reportsTableRef?.table?.getFilteredSelectedRowModel().rows.length }}
                            </Badge>
                        </Button>
                    </div>
                    <Button size="sm"
                        class="h-9 px-4 gap-2 bg-white text-zinc-950 hover:bg-white/90 font-bold shadow-sm"
                        @click="showUploadModal = true">
                        <Plus class="h-4 w-4" />
                        Add
                    </Button>
                </CardHeader>
                <CardContent>
                    <ReportsListDataTable ref="reportsTableRef" :meets="meets" :search-query="searchQuery"
                        :groups-map="groupsMap" @view-details="handleViewDetails" @delete-meet="handleDeleteMeet">
                        <template #toolbar="{ table }">
                            <div class="space-y-3 pb-3">
                                <div class="flex items-center gap-2">
                                    <div class="relative flex-1">
                                        <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input v-model="searchQuery" placeholder="Search by meet ID (link)"
                                            class="pl-10 h-10 w-full bg-zinc-50/50" />
                                    </div>
                                    <DataTableViewOptions :table="table" />
                                </div>
                                <div v-if="searchQuery"
                                    class="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span>Active filters:</span>
                                    <Badge variant="secondary" class="h-6 gap-1 px-2 font-mono lower">
                                        Meet ID: {{ searchQuery }}
                                        <button @click="searchQuery = ''" class="hover:text-foreground">
                                            <X class="h-3 w-3 ml-1" />
                                        </button>
                                    </Badge>
                                </div>
                            </div>
                        </template>
                    </ReportsListDataTable>
                </CardContent>
            </Card>
        </div>

        <AlertDialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ t('reports.deleteModal.title') }}</AlertDialogTitle>
                    <AlertDialogDescription>{{ t('reports.deleteModal.message_single') }}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="meetToDeleteId = null">{{ t('common.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction @click="executeDelete" class="bg-destructive text-destructive-foreground">
                        {{ t('common.delete') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog :open="showFilterModal" @update:open="(val) => !val && cancelFilter()">
            <DialogContent class="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import Options</DialogTitle>
                    <DialogDescription>Choose a processing mode.</DialogDescription>
                </DialogHeader>
                <div class="grid gap-4 py-4">
                    <Button variant="outline" class="h-auto py-4 px-4 justify-start text-left"
                        @click="processFiles('related')">
                        <div>
                            <div class="font-semibold">Process Related Only</div>
                            <div class="text-xs text-muted-foreground mt-1">Matches existing groups.</div>
                        </div>
                    </Button>
                    <Button variant="outline" class="h-auto py-4 px-4 justify-start text-left"
                        @click="processFiles('all')">
                        <div>
                            <div class="font-semibold">Process All Files</div>
                            <div class="text-xs text-muted-foreground mt-1">Import everything.</div>
                        </div>
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="ghost" @click="cancelFilter">Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog :open="showUploadModal" @update:open="showUploadModal = $event">
            <DialogContent class="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Upload Reports</DialogTitle>
                    <DialogDescription>Drag and drop Google Meet CSV reports here.</DialogDescription>
                </DialogHeader>
                <DropZone :is-processing="isProcessing" @files-dropped="(files) => {
                    handleFilesDropped(files, loadMeets)
                    showUploadModal = false
                }" />
            </DialogContent>
        </Dialog>
    </div>
</template>