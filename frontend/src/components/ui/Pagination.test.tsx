import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

const meta = (current_page: number, last_page: number, total: number) => ({ current_page, last_page, per_page: 50, total });

it('renders nothing when everything fits on one page', () => {
    const { container } = render(<Pagination meta={meta(1, 1, 12)} onPageChange={vi.fn()} itemLabel="orders" />);
    expect(container).toBeEmptyDOMElement();
});

it('shows the position and moves between pages', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination meta={meta(2, 3, 120)} onPageChange={onPageChange} itemLabel="orders" />);

    expect(screen.getByText('Page 2 of 3 · 120 orders')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
});

it('disables the buttons at either end', () => {
    const { rerender } = render(<Pagination meta={meta(1, 3, 120)} onPageChange={vi.fn()} itemLabel="orders" />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    rerender(<Pagination meta={meta(3, 3, 120)} onPageChange={vi.fn()} itemLabel="orders" />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});
