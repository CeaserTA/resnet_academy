import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('only updates once the value has stopped changing for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: 'g' },
    });
    expect(result.current).toBe('g');

    rerender({ value: 'gr' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'grade' });
    act(() => vi.advanceTimersByTime(200));
    // 400ms since the first change, but only 200ms since the last — still the old value
    expect(result.current).toBe('g');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('grade');
});
