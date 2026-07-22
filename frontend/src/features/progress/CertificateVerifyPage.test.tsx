import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { CertificateVerifyPage } from '@/features/progress/CertificateVerifyPage';
import type { CertificateVerification } from '@/lib/api/types';

const { verification } = vi.hoisted(() => {
    const verification: CertificateVerification = {
        valid: true,
        certificate_number: 'CERT-ABC123',
        student_name: 'Ada Lovelace',
        course_title: 'Introduction to Laravel',
        issued_at: '2026-01-01T00:00:00Z',
    };

    return { verification };
});

vi.mock('@/features/progress/api', () => ({
    verifyCertificate: vi.fn().mockResolvedValue(verification),
}));

it('shows the certificate details after a successful verification lookup', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <CertificateVerifyPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('Certificate number'), 'CERT-ABC123');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Valid certificate')).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/Introduction to Laravel/)).toBeInTheDocument();
});
