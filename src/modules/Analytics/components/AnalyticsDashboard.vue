<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { QrCode, Copy, Search, ChevronDown, ChevronRight } from 'lucide-vue-next';
import QrCodeModal from '@/shared/components/QrCodeModal.vue';
import { toast } from '@/services/toast';
import { useQuerySync } from '@/composables/useQuerySync';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const { t } = useI18n();

const props = defineProps({
  stats: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  groupsMap: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['view-details', 'refresh']);

const showQrModal = ref(false);
const selectedMeetId = ref(null);
const searchQuery = ref('');
useQuerySync({ search: searchQuery });

const collapsedSections = ref(new Set());

// Load collapsed state from session storage
onMounted(() => {
  try {
    const stored = sessionStorage.getItem('analytics_sections_collapsed');
    if (stored) {
      const ids = JSON.parse(stored);
      if (Array.isArray(ids)) {
        collapsedSections.value = new Set(ids);
      }
    }
  } catch (e) {
    console.error('Failed to load section state:', e);
  }
});

// Save state when changed
function toggleSection(id) {
  if (collapsedSections.value.has(id)) {
    collapsedSections.value.delete(id);
  } else {
    collapsedSections.value.add(id);
  }

  try {
    sessionStorage.setItem('analytics_sections_collapsed', JSON.stringify([...collapsedSections.value]));
  } catch (e) {
    console.error('Failed to save section state:', e);
  }
}

const enrichedStats = computed(() => {
  return props.stats.map(stat => {
    const group = props.groupsMap[stat.meetId];
    return {
      ...stat,
      displayName: group ? group.name : stat.meetId,
      teacherName: group ? group.teacher : null,
      course: group ? group.course : null,
      isGrouped: !!group
    };
  });
});

const filteredStats = computed(() => {
  if (!searchQuery.value) return enrichedStats.value;
  const query = searchQuery.value.toLowerCase();
  return enrichedStats.value.filter(stat =>
    stat.meetId.toLowerCase().includes(query) ||
    (stat.displayName && stat.displayName.toLowerCase().includes(query)) ||
    (stat.teacherName && stat.teacherName.toLowerCase().includes(query))
  );
});

const groupedStats = computed(() => {
  const groups = {
    4: [],
    3: [],
    2: [],
    1: [],
    other: []
  };

  filteredStats.value.forEach(stat => {
    if (stat.course && stat.course >= 1 && stat.course <= 4) {
      groups[stat.course].push(stat);
    } else {
      groups.other.push(stat);
    }
  });

  // Sort within groups
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => {
      const nameA = a.displayName || '';
      const nameB = b.displayName || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  });

  // Return as array of sections for easy iteration
  return [
    { title: '4th Course', items: groups[4], id: 'course-4', key: 'course4' },
    { title: '3rd Course', items: groups[3], id: 'course-3', key: 'course3' },
    { title: '2nd Course', items: groups[2], id: 'course-2', key: 'course2' },
    { title: '1st Course', items: groups[1], id: 'course-1', key: 'course1' },
    { title: 'Other Meets', items: groups.other, id: 'other', key: 'other' }
  ].filter(section => section.items.length > 0);
});

function openDetails(stat) {
  emit('view-details', stat.meetId);
}

function openQrCode(meetId) {
  selectedMeetId.value = meetId;
  showQrModal.value = true;
}

async function copyMeetId(meetId) {
  try {
    await navigator.clipboard.writeText(meetId);
    toast.success(t('analytics.toast.copySuccess'));
  } catch (e) {
    console.error('Failed to copy:', e);
    toast.error(t('analytics.toast.copyError'));
  }
}

defineExpose({ refresh: () => emit('refresh') });
</script>

<template>
  <div class="space-y-8">
    <h2 class="text-2xl font-bold tracking-tight">{{ $t('analytics.title') }}</h2>

    <!-- Search Row -->
    <div class="relative w-full">
      <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input v-model="searchQuery" :placeholder="$t('analytics.searchPlaceholder')" class="pl-8" />
    </div>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <template v-else>
      <div v-if="groupedStats.length === 0" class="text-center py-12 text-muted-foreground">
        {{ $t('analytics.noData') }}
      </div>

      <div v-for="section in groupedStats" :key="section.id" class="space-y-4">
        <Button variant="ghost" @click="toggleSection(section.id)" class="flex items-center gap-2 w-full justify-start pl-0 hover:bg-transparent hover:text-foreground">
          <div class="p-1 rounded-md hover:bg-muted transition-colors">
            <ChevronRight v-if="collapsedSections.has(section.id) && !searchQuery"
              class="w-4 h-4 text-muted-foreground" />
            <ChevronDown v-else class="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-semibold text-muted-foreground">{{ $t(`analytics.sections.${section.key}`) }}</h3>

          <Badge v-if="collapsedSections.has(section.id) && !searchQuery" variant="secondary" class="ml-2">
            {{ section.items.length }}
          </Badge>

          <Separator class="flex-1 ml-4" />
        </Button>

        <div v-show="!collapsedSections.has(section.id) || searchQuery"
          class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card v-for="stat in section.items" :key="stat.meetId"
            class="hover:shadow-lg transition-all duration-200 cursor-pointer group relative overflow-hidden"
            @click="openDetails(stat)" :title="$t('analytics.card.tooltips.viewDetails')">
            <CardHeader class="p-6 pb-2 space-y-0">
               <div class="flex items-start justify-between">
                <div class="space-y-1">
                  <CardTitle class="text-base font-semibold leading-none tracking-tight flex items-center gap-2"
                    :title="$t('analytics.card.tooltips.groupName')">
                    {{ stat.displayName || stat.meetId }}
                    <Badge v-if="stat.teacherName" variant="secondary" class="text-xs font-normal"
                      :title="$t('analytics.card.tooltips.teacher')">
                      {{ stat.teacherName }}
                    </Badge>
                  </CardTitle>
                  <CardDescription class="flex items-center gap-2 text-sm"
                    :title="$t('analytics.card.tooltips.meetId')">
                    {{ stat.meetId }}
                    <Button variant="ghost" size="icon" class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="copyMeetId(stat.meetId)" :title="$t('analytics.card.tooltips.copyMeetId')">
                        <Copy class="w-3 h-3" />
                    </Button>
                  </CardDescription>
                </div>
                <div class="flex gap-1">
                  <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full" @click.stop="openQrCode(stat.meetId)" :title="$t('analytics.card.tooltips.showQr')">
                     <QrCode class="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                  <Badge :class="[
                    stat.attendancePercentage >= 75 ? 'bg-green-100 text-green-800 hover:bg-green-100/80 border-transparent' :
                    stat.attendancePercentage >= 50 ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 border-transparent' :
                    'bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent',
                    'px-2.5 py-0.5'
                  ]"
                    variant="outline"
                    :title="$t('analytics.card.tooltips.attendance')">
                    {{ stat.attendancePercentage }}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent class="p-6 pt-4">
               <div class="grid grid-cols-3 gap-4 border-t pt-4">
                <div :title="$t('analytics.card.tooltips.totalSessions')">
                  <p class="text-sm font-medium text-muted-foreground">{{ $t('analytics.card.totalSessions') }}</p>
                  <p class="text-2xl font-bold">{{ stat.totalSessions }}</p>
                </div>
                <div :title="$t('analytics.card.tooltips.avgDuration')">
                  <p class="text-sm font-medium text-muted-foreground">{{ $t('analytics.card.avgDuration') }}</p>
                  <p class="text-2xl font-bold">~{{ stat.avgDuration.toFixed(0) }}{{ $t('duration.minutes') }}</p>
                </div>
                <div :title="$t('analytics.card.tooltips.participants')">
                  <p class="text-sm font-medium text-muted-foreground">{{ $t('analytics.card.participants') }}</p>
                  <p class="text-2xl font-bold flex items-baseline gap-1">
                    {{ stat.activeParticipantsCount }}
                    <span class="text-sm font-normal text-muted-foreground">/ {{ stat.uniqueParticipantsCount }}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>

    <QrCodeModal :is-open="showQrModal" :meet-id="selectedMeetId" @close="showQrModal = false" />
  </div>
</template>