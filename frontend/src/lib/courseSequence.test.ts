import { describe, expect, it } from 'vitest';
import {
    describeLockedModule,
    findAdjacentItems,
    findNextIncompleteItem,
    flattenModuleItems,
    itemLinkFor,
} from '@/lib/courseSequence';
import type { Module, ModuleItem, ModuleProgressEntry } from '@/lib/api/types';

function makeResourceItem(overrides: Partial<Extract<ModuleItem, { item_type: 'resource' }>>): ModuleItem {
    return {
        item_type: 'resource',
        id: 1,
        module_id: 1,
        type: 'reading',
        title: 'Item',
        description: null,
        is_required: true,
        order_index: 1,
        is_complete: false,
        details: {},
        ...overrides,
    };
}

function makeModule(overrides: Partial<Module>): Module {
    return {
        id: 1,
        course_id: 1,
        title: 'Module',
        description: null,
        order_index: 1,
        scheduled_start_at: null,
        group_ids: [],
        items: [],
        status: 'not_started',
        deleted_at: null,
        ...overrides,
    };
}

describe('flattenModuleItems', () => {
    it('sorts modules and items by order_index and flattens into one list', () => {
        const modules: Module[] = [
            makeModule({
                id: 2,
                order_index: 2,
                items: [makeResourceItem({ id: 20, module_id: 2, title: 'Second module item' })],
            }),
            makeModule({
                id: 1,
                order_index: 1,
                items: [
                    makeResourceItem({ id: 11, module_id: 1, order_index: 2, title: 'B' }),
                    makeResourceItem({ id: 10, module_id: 1, order_index: 1, title: 'A' }),
                ],
            }),
        ];

        const flat = flattenModuleItems(modules);

        expect(flat.map((item) => item.title)).toEqual(['A', 'B', 'Second module item']);
    });
});

describe('itemLinkFor', () => {
    it('routes each item type to its own page', () => {
        expect(itemLinkFor(makeResourceItem({ id: 5 }), 7)).toBe('/learn/resources/5?course=7');
        expect(
            itemLinkFor(
                { item_type: 'assignment', id: 5, title: 'A', due_at: null, submission_type: 'file', max_score: '100', allow_late: true, is_required: true, order_index: 1, is_complete: false, my_submission: null },
                7,
            ),
        ).toBe('/learn/assignments/5?course=7');
        expect(
            itemLinkFor(
                { item_type: 'evaluation', id: 5, title: 'E', description: null, pass_score: '70', max_attempts: null, time_limit_minutes: null, is_required: true, order_index: 1, is_complete: false, attempts_used: null, my_best_attempt: null },
                7,
            ),
        ).toBe('/learn/evaluations/5?course=7');
    });
});

describe('findAdjacentItems', () => {
    it('finds the previous and next item by position, regardless of completion', () => {
        const flat = [
            makeResourceItem({ id: 1, title: 'First' }),
            makeResourceItem({ id: 2, title: 'Middle' }),
            makeResourceItem({ id: 3, title: 'Last' }),
        ];

        expect(findAdjacentItems(flat, 'resource', 2)).toEqual({ prevItem: flat[0], nextItem: flat[2] });
        expect(findAdjacentItems(flat, 'resource', 1)).toEqual({ prevItem: null, nextItem: flat[1] });
        expect(findAdjacentItems(flat, 'resource', 3)).toEqual({ prevItem: flat[1], nextItem: null });
    });

    it('returns nulls when the item cannot be found', () => {
        expect(findAdjacentItems([], 'resource', 99)).toEqual({ prevItem: null, nextItem: null });
    });
});

describe('findNextIncompleteItem', () => {
    it('returns the first incomplete item in order', () => {
        const flat = [
            makeResourceItem({ id: 1, is_complete: true }),
            makeResourceItem({ id: 2, is_complete: false }),
            makeResourceItem({ id: 3, is_complete: false }),
        ];

        expect(findNextIncompleteItem(flat)?.id).toBe(2);
    });

    it('returns null when everything is complete', () => {
        const flat = [makeResourceItem({ id: 1, is_complete: true })];

        expect(findNextIncompleteItem(flat)).toBeNull();
    });
});

describe('describeLockedModule', () => {
    it('returns null for group-scoped modules — applicability can\'t be determined client-side', () => {
        const module = makeModule({ id: 2, order_index: 2, group_ids: [1] });
        const allModules = [makeModule({ id: 1, order_index: 1 }), module];

        expect(describeLockedModule(module, allModules, new Map())).toBeNull();
    });

    it('explains a future schedule date', () => {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const module = makeModule({ id: 1, order_index: 1, scheduled_start_at: futureDate });

        expect(describeLockedModule(module, [module], new Map())).toBe(
            `Opens ${new Date(futureDate).toLocaleDateString()}`,
        );
    });

    it('explains an incomplete previous module', () => {
        const previous = makeModule({ id: 1, order_index: 1, title: 'Module 1' });
        const locked = makeModule({ id: 2, order_index: 2 });
        const progress: Map<number, ModuleProgressEntry> = new Map([
            [1, { module_id: 1, module_title: 'Module 1', order_index: 1, status: 'not_started', unlocked_at: null, completed_at: null }],
        ]);

        expect(describeLockedModule(locked, [previous, locked], progress)).toBe('Complete "Module 1" first');
    });

    it('returns null once the previous module is completed (nothing left to explain)', () => {
        const previous = makeModule({ id: 1, order_index: 1, title: 'Module 1' });
        const locked = makeModule({ id: 2, order_index: 2 });
        const progress: Map<number, ModuleProgressEntry> = new Map([
            [1, { module_id: 1, module_title: 'Module 1', order_index: 1, status: 'completed', unlocked_at: null, completed_at: '2026-01-01' }],
        ]);

        expect(describeLockedModule(locked, [previous, locked], progress)).toBeNull();
    });
});
