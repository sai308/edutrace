# Module Scaffolding Templates

Replace `<Name>` with PascalCase module name, `<name>` with camelCase, `<store>` with the IndexedDB store name.

---

## types/<name>.d.ts

```typescript
export interface <Name> {
    id?: string | number;
    name: string;
    // TODO: add entity fields
}

export interface <Name>FormData {
    id?: string | number;
    name: string;
    // TODO: add form fields
    [key: string]: any;
}
```

---

## services/<name>.repository.ts

```typescript
import { BaseRepository } from '@/shared/services/BaseRepository';
import type { <Name> } from '../types/<name>';

class <Name>Repository extends BaseRepository<'<store>'> {
    constructor() {
        super('<store>');
    }

    async getAll<Name>s(): Promise<<Name>[]> {
        return this.getAll();
    }

    async save<Name>(item: <Name>): Promise<number | string> {
        if (item.id) {
            await this.put(item);
            return item.id;
        }
        return this.add(item);
    }

    async delete<Name>(id: string | number): Promise<void> {
        return this.delete(id as any);
    }
}

export const <name>Repository = new <Name>Repository();
```

---

## services/<name>.service.ts

```typescript
import { <name>Repository } from './<name>.repository';
import { v4 as uuidv4 } from 'uuid';
import type { <Name>, <Name>FormData } from '../types/<name>';

export class <Name>Service {
    async load<Name>s(): Promise<<Name>[]> {
        return <name>Repository.getAll<Name>s();
    }

    async save<Name>(formData: <Name>FormData): Promise<<Name>> {
        if (!formData.name) {
            throw new Error('Validation failed: Name is required');
        }
        const item: <Name> = {
            ...formData,
            id: formData.id || uuidv4(),
            name: formData.name,
        };
        await <name>Repository.save<Name>(item);
        return item;
    }

    async delete<Name>(id: string | number): Promise<void> {
        await <name>Repository.delete<Name>(id);
    }
}

export const <name>Service = new <Name>Service();
```

---

## services/tests/<name>.service.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { <Name>Service } from '../<name>.service';
import { <name>Repository } from '../<name>.repository';

vi.mock('../<name>.repository');

describe('<Name>Service', () => {
    let service: <Name>Service;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new <Name>Service();
    });

    describe('load<Name>s', () => {
        it('should return all items from repository', async () => {
            const mockItems = [{ id: '1', name: 'Test' }];
            (<name>Repository.getAll<Name>s as any).mockResolvedValue(mockItems);

            const result = await service.load<Name>s();

            expect(<name>Repository.getAll<Name>s).toHaveBeenCalled();
            expect(result).toEqual(mockItems);
        });
    });

    describe('save<Name>', () => {
        it('should save a new item with generated id', async () => {
            (<name>Repository.save<Name> as any).mockResolvedValue('new-id');

            const result = await service.save<Name>({ name: 'New Item' });

            expect(<name>Repository.save<Name>).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'New Item' })
            );
            expect(result.id).toBeDefined();
        });

        it('should throw on missing name', async () => {
            await expect(service.save<Name>({ name: '' } as any))
                .rejects.toThrow('Name is required');
        });
    });

    describe('delete<Name>', () => {
        it('should delegate to repository', async () => {
            (<name>Repository.delete<Name> as any).mockResolvedValue(undefined);

            await service.delete<Name>('id-1');

            expect(<name>Repository.delete<Name>).toHaveBeenCalledWith('id-1');
        });
    });
});
```

---

## composables/use<Name>.ts

```typescript
import { ref } from 'vue';
import { <name>Service } from '../services/<name>.service';
import { useToast } from '@/composables/useToast';
import { useI18n } from 'vue-i18n';
import type { <Name>, <Name>FormData } from '../types/<name>';

export function use<Name>() {
    const { t } = useI18n();
    const { toast } = useToast();

    const items = ref<<Name>[]>([]);
    const isLoading = ref(false);

    async function loadData() {
        isLoading.value = true;
        try {
            items.value = await <name>Service.load<Name>s();
        } catch (e) {
            toast({ title: t('common.error'), variant: 'destructive' });
        } finally {
            isLoading.value = false;
        }
    }

    async function saveItem(formData: <Name>FormData) {
        try {
            await <name>Service.save<Name>(formData);
            await loadData();
            toast({ title: t('<name>.saved') });
        } catch (e) {
            toast({ title: t('common.error'), variant: 'destructive' });
        }
    }

    async function deleteItem(id: string | number) {
        try {
            await <name>Service.delete<Name>(id);
            await loadData();
            toast({ title: t('<name>.deleted') });
        } catch (e) {
            toast({ title: t('common.error'), variant: 'destructive' });
        }
    }

    return { items, isLoading, loadData, saveItem, deleteItem };
}
```

---

## pages/<Name>Page.vue

```vue
<script setup>
import { onMounted } from 'vue';
import <Name>View from '../views/<Name>View.vue';
import { use<Name> } from '../composables/use<Name>';

const { items, isLoading, loadData, saveItem, deleteItem } = use<Name>();

onMounted(loadData);
</script>

<template>
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <<Name>View
            :items="items"
            :is-loading="isLoading"
            @save="saveItem"
            @delete="deleteItem"
            @refresh="loadData"
        />
    </div>
</template>
```

---

## views/<Name>View.vue

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Trash2, Edit2, Search } from 'lucide-vue-next';
import { useQuerySync } from '@/composables/useQuerySync';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { <Name>, <Name>FormData } from '../types/<name>';

const { t } = useI18n();

const props = defineProps({
    items: { type: Array as () => <Name>[], default: () => [] },
    isLoading: { type: Boolean, default: false },
});

const emit = defineEmits<{
    save: [formData: <Name>FormData];
    delete: [id: string | number];
    refresh: [];
}>();

const searchQuery = ref('');
const showDeleteModal = ref(false);
const itemToDeleteId = ref<string | number | null>(null);

useQuerySync({ search: searchQuery });

const filteredItems = computed(() => {
    if (!searchQuery.value) return props.items;
    const q = searchQuery.value.toLowerCase();
    return props.items.filter(i => i.name.toLowerCase().includes(q));
});

function openDeleteModal(id: string | number) {
    itemToDeleteId.value = id;
    showDeleteModal.value = true;
}

function handleDeleteConfirm() {
    if (!itemToDeleteId.value) return;
    emit('delete', itemToDeleteId.value);
    showDeleteModal.value = false;
    itemToDeleteId.value = null;
}
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold tracking-tight">{{ $t('<name>.title') }}</h2>
            <Button @click="$emit('save', {} as <Name>FormData)">
                <Plus class="w-4 h-4" />
                <span class="hidden sm:inline ml-2">{{ $t('<name>.add') }}</span>
            </Button>
        </div>

        <div class="flex items-center gap-2">
            <div class="relative flex-1">
                <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input v-model="searchQuery" :placeholder="$t('<name>.searchPlaceholder')" class="pl-8" />
            </div>
        </div>

        <div class="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{{ $t('<name>.table.name') }}</TableHead>
                        <TableHead class="text-right">{{ $t('<name>.table.actions') }}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="filteredItems.length === 0">
                        <TableCell colspan="2" class="h-24 text-center text-muted-foreground">
                            {{ searchQuery ? $t('<name>.noMatch') : $t('<name>.noItems') }}
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="item in filteredItems" :key="item.id as string">
                        <TableCell class="font-medium">{{ item.name }}</TableCell>
                        <TableCell class="text-right">
                            <Button variant="ghost" size="sm" @click="openDeleteModal(item.id!)">
                                <Trash2 class="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <AlertDialog :open="showDeleteModal" @update:open="showDeleteModal = $event">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t('<name>.deleteModal.title') }}</AlertDialogTitle>
                    <AlertDialogDescription>{{ $t('<name>.deleteModal.message') }}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="showDeleteModal = false">{{ $t('common.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        @click="handleDeleteConfirm">
                        {{ $t('common.delete') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
</template>
```
