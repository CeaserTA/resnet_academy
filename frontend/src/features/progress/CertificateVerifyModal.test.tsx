import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { CertificateVerifyModal } from '@/features/progress/CertificateVerifyModal';
import { verifyCertificate } from '@/features/progress/api';
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

function renderModal(initialNumber?: string) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <CertificateVerifyModal isOpen onClose={() => {}} initialNumber={initialNumber} />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

it('shows the certificate details after a successful verification lookup', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Certificate number'), 'CERT-ABC123');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Valid certificate')).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/Introduction to Laravel/)).toBeInTheDocument();
});

// Scanning the QR code printed on a certificate arrives with the number already known; making
// the visitor retype it would defeat the point of the code.
it('looks up a pre-filled number on open without waiting for a click', async () => {
    vi.mocked(verifyCertificate).mockClear();
    renderModal('CERT-ABC123');

    expect(await screen.findByText('Valid certificate')).toBeInTheDocument();
    expect(screen.getByLabelText('Certificate number')).toHaveValue('CERT-ABC123');
    expect(verifyCertificate).toHaveBeenCalledTimes(1);
});
