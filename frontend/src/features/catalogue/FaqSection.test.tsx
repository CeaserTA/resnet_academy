import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect } from 'vitest';
import { FaqSection } from '@/features/catalogue/FaqSection';

it('expands an answer on click and collapses it on a second click', async () => {
    const user = userEvent.setup();
    render(<FaqSection />);

    const question = screen.getByRole('button', { name: 'How does enrolment work?' });
    expect(question).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/there's no waitlist/)).not.toBeInTheDocument();

    await user.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/there's no waitlist/)).toBeInTheDocument();

    await user.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/there's no waitlist/)).not.toBeInTheDocument();
});
