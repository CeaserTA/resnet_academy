import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '@/components/ui/Select';

class PointerEventPolyfill extends Event {
    constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        Object.assign(this, init);
    }

    public readonly pointerId = 0;
    public readonly width = 0;
    public readonly height = 0;
    public readonly pressure = 0;
    public readonly tangentialPressure = 0;
    public readonly tiltX = 0;
    public readonly tiltY = 0;
    public readonly twist = 0;
    public readonly isPrimary = true;
    public readonly button = 0;
    public readonly buttons = 1;
    public readonly clientX = 0;
    public readonly clientY = 0;
    public readonly screenX = 0;
    public readonly screenY = 0;
    public readonly offsetX = 0;
    public readonly offsetY = 0;
    public readonly movementX = 0;
    public readonly movementY = 0;
    public readonly relatedTarget = null;
    public readonly ctrlKey = false;
    public readonly shiftKey = false;
    public readonly altKey = false;
    public readonly metaKey = false;
    public readonly getModifierState = () => false;
    public readonly pointerType = 'mouse';
}

if (!window.PointerEvent) {
    window.PointerEvent = PointerEventPolyfill as unknown as typeof window.PointerEvent;
}

if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = () => false;
}

if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = () => undefined;
}

if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = () => undefined;
}

if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => undefined;
}

if (!window.Element.prototype.scrollIntoView) {
    window.Element.prototype.scrollIntoView = () => undefined;
}

describe('Select', () => {
    it('supports controlled value changes and forwards a synthetic change event', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <Select
                label="Status"
                value="pending"
                onChange={handleChange}
                options={[
                    { label: 'Pending', value: 'pending' },
                    { label: 'Paid', value: 'paid' },
                ]}
            />,
        );

        await user.click(screen.getByRole('combobox'));
        await user.click(screen.getByText('Paid'));

        expect(handleChange).toHaveBeenCalled();
        expect(handleChange.mock.calls[0][0].target.value).toBe('paid');
    });

    it('supports form-style name handling via a hidden input', () => {
        const { container } = render(
            <Select label="Status" name="status" onChange={() => undefined} options={[{ label: 'Pending', value: 'pending' }]} />,
        );

        const hiddenInput = container.querySelector('input[name="status"]');

        expect(hiddenInput).toBeInTheDocument();
        expect(hiddenInput).toHaveAttribute('name', 'status');
    });
});
