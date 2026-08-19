import type { Module, ModuleItem, ModuleProgressEntry } from '@/lib/api/types';

/**
 * Sorts modules by `order_index` and flattens each module's items (also sorted by
 * `order_index`) into one ordered list — the single source of truth for "what comes before/after
 * what" across an entire course, shared by the resource viewer's prev/next nav, the "Continue"
 * entry points, and (indirectly) the locked-module explanations below.
 */
export function flattenModuleItems(modules: Module[]): ModuleItem[] {
    return modules
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .flatMap((module) => module.items.slice().sort((a, b) => a.order_index - b.order_index));
}

export function itemLinkFor(item: ModuleItem, courseId: number): string {
    if (item.item_type === 'assignment') {
        return `/learn/assignments/${item.id}?course=${courseId}`;
    }

    if (item.item_type === 'evaluation') {
        return `/learn/evaluations/${item.id}?course=${courseId}`;
    }

    return `/learn/resources/${item.id}?course=${courseId}`;
}

/**
 * Adjacency by position in the flattened sequence — not by completion. Used for the resource
 * viewer's Previous/Next links, which should always step through the course in order regardless
 * of what's been completed.
 */
export function findAdjacentItems(
    flatItems: ModuleItem[],
    itemType: ModuleItem['item_type'],
    itemId: number,
): { prevItem: ModuleItem | null; nextItem: ModuleItem | null } {
    const currentIndex = flatItems.findIndex((item) => item.item_type === itemType && item.id === itemId);

    if (currentIndex === -1) {
        return { prevItem: null, nextItem: null };
    }

    return {
        prevItem: currentIndex > 0 ? flatItems[currentIndex - 1] : null,
        nextItem: currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null,
    };
}

/**
 * The first incomplete item across ALL modules (locked or not). Used by the resource viewer's
 * prev/next navigation and the dashboard card's "Continue" link where we have no progress map.
 */
export function findNextIncompleteItem(flatItems: ModuleItem[]): ModuleItem | null {
    return flatItems.find((item) => !item.is_complete) ?? null;
}

/**
 * The first incomplete item from UNLOCKED modules only (not_started, in_progress, completed).
 * Used by the course player "Continue" banner so a locked module never falsely blocks the banner
 * and a course with only locked remaining modules doesn't incorrectly show "Course completed".
 *
 * Returns null only when every item in every unlocked module is complete — i.e. the student
 * has genuinely finished all content available to them right now.
 */
export function findNextIncompleteItemInUnlockedModules(
    modules: Module[],
    progressByModuleId: Map<number, ModuleProgressEntry>,
): ModuleItem | null {
    const sorted = modules.slice().sort((a, b) => a.order_index - b.order_index);

    for (const module of sorted) {
        const status = progressByModuleId.get(module.id)?.status;
        // Skip modules the backend hasn't unlocked yet
        if (!status || status === 'locked') continue;

        const incomplete = module.items
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .find((item) => !item.is_complete);

        if (incomplete) return incomplete;
    }

    return null;
}

/**
 * True only when the course has at least one unlocked module AND every item in every
 * unlocked module is complete. A course where ALL modules are still locked is "not started",
 * not "completed" — we never show the completion banner in that case.
 */
export function isCourseCompleted(
    modules: Module[],
    progressByModuleId: Map<number, ModuleProgressEntry>,
): boolean {
    const unlockedModules = modules.filter((m) => {
        const status = progressByModuleId.get(m.id)?.status;
        return status && status !== 'locked';
    });

    if (unlockedModules.length === 0) return false;

    return unlockedModules.every((m) =>
        progressByModuleId.get(m.id)?.status === 'completed',
    );
}

/**
 * Explains why a locked module is locked, mirroring the two conditions
 * `ProgressEngine::evaluateCourseUnlocks()` checks server-side (app/Services/Progress/
 * ProgressEngine.php) — a schedule date in the future, or the previous module not yet completed.
 * Returns null (plain "Locked", no explanation) when the module is scoped to specific groups:
 * the frontend has no way to know if the current student is actually a member, so guessing here
 * could show a misleading reason for a module that will never unlock for them regardless.
 */
export function describeLockedModule(
    module: Module,
    allModules: Module[],
    progressByModuleId: Map<number, ModuleProgressEntry>,
): string | null {
    if (module.group_ids && module.group_ids.length > 0) {
        return null;
    }

    if (module.scheduled_start_at && new Date(module.scheduled_start_at) > new Date()) {
        return `Opens ${new Date(module.scheduled_start_at).toLocaleDateString()}`;
    }

    const previousModule = allModules
        .filter((candidate) => candidate.order_index < module.order_index && (candidate.group_ids?.length ?? 0) === 0)
        .sort((a, b) => b.order_index - a.order_index)[0];

    if (previousModule && progressByModuleId.get(previousModule.id)?.status !== 'completed') {
        return `Complete "${previousModule.title}" first`;
    }

    return null;
}
