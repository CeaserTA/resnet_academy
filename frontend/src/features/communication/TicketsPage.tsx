import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, LifeBuoy, Plus, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { TicketConversation } from '@/features/communication/TicketConversation';
import { updateTicket } from '@/features/communication/api';
import { useCreateTicket, useTicket, useTickets } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import { ticketStatusDisplay } from '@/lib/statusBadge';
import { cn } from '@/lib/utils';
import type { TicketStatus } from '@/lib/api/types';

const statusOptions: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

function NewTicketForm({ onCreated, onCancel }: { onCreated: (ticketId: number) => void; onCancel: () => void }) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | null>(null);
    const createTicket = useCreateTicket();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const ticket = await createTicket.mutateAsync({ subject, body });
            onCreated(ticket.id);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not raise this ticket.');
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-md border border-surface-100 bg-surface-50 p-4"
        >
            {error && <Alert variant="error" message={error} />}
            <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <Textarea label="Describe the issue" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
            <div className="flex gap-2">
                <Button type="submit" isLoading={createTicket.isPending}>
                    Submit
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

export function TicketsPage() {
    const { user } = useAuth();
    const { data: tickets, isLoading } = useTickets();
    const [isCreating, setIsCreating] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
        const fromQuery = searchParams.get('ticket');
        return fromQuery ? Number(fromQuery) : null;
    });
    const { data: selectedTicket } = useTicket(selectedTicketId ?? NaN);
    const queryClient = useQueryClient();
    const quickUpdateStatus = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) => updateTicket(id, { status }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['tickets', id] });
        },
    });

    const isStaff = user?.role === 'admin' || user?.role === 'instructor';

    const closeTicket = () => {
        setSelectedTicketId(null);
        if (searchParams.has('ticket')) {
            searchParams.delete('ticket');
            setSearchParams(searchParams, { replace: true });
        }
    };

    if (isStaff) {
        return (
            <div>
                <h1 className="text-2xl">Support tickets</h1>

                <div className="mt-6 flex flex-col gap-4 lg:flex-row">
                    <div className={cn(selectedTicketId ? 'hidden lg:block lg:w-2/5' : 'w-full')}>
                        {isLoading && <Spinner />}

                        {!isLoading && (tickets ?? []).length === 0 && (
                            <EmptyState icon={LifeBuoy} title="No tickets" description="Nothing raised yet." />
                        )}

                        {!isLoading && (tickets ?? []).length > 0 && (
                            <div className="overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-100 text-left">
                                        <tr>
                                            <th className="px-4 py-2 font-medium text-ink-600">Student</th>
                                            <th className="px-4 py-2 font-medium text-ink-600">Subject</th>
                                            <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                                            <th className="px-4 py-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(tickets ?? []).map((ticket, index) => {
                                            return (
                                                <tr key={ticket.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-ink-900">{ticket.student?.name ?? '—'}</p>
                                                        <p className="text-xs text-ink-600">{ticket.student?.email}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-ink-600">
                                                        {ticket.subject}
                                                        {ticket.course && (
                                                            <span className="block text-xs text-ink-600">{ticket.course.title}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Select
                                                            label={`Status — ${ticket.subject}`}
                                                            labelClassName="sr-only"
                                                            value={ticket.status}
                                                            onChange={(e) =>
                                                                quickUpdateStatus.mutate({ id: ticket.id, status: e.target.value })
                                                            }
                                                            className="py-1 text-sm"
                                                        >
                                                            {statusOptions.map((option) => (
                                                                <option key={option} value={option}>
                                                                    {ticketStatusDisplay(option).label}
                                                                </option>
                                                            ))}
                                                        </Select>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            className="px-2 py-1"
                                                            onClick={() => setSelectedTicketId(ticket.id)}
                                                            aria-label={`View ${ticket.subject}`}
                                                        >
                                                            <Eye className="size-4" aria-hidden="true" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {selectedTicketId && (
                        <div className="w-full rounded-lg border border-surface-100 bg-surface-0 p-4 lg:w-3/5">
                            {!selectedTicket ? (
                                <Spinner />
                            ) : (
                                <>
                                    <div className="mb-4 flex items-start justify-between gap-2">
                                        <div>
                                            <h2 className="text-lg text-ink-900">{selectedTicket.subject}</h2>
                                            <p className="text-sm text-ink-600">{selectedTicket.student?.name}</p>
                                        </div>
                                        <Button variant="ghost" className="px-2 py-1" onClick={closeTicket} aria-label="Close">
                                            <X className="size-4" aria-hidden="true" />
                                        </Button>
                                    </div>
                                    <TicketConversation ticket={selectedTicket} />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">Support</h1>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="size-4" aria-hidden="true" />
                        New ticket
                    </Button>
                )}
            </div>

            {isCreating && (
                <div className="mt-4">
                    <NewTicketForm
                        onCreated={(ticketId) => {
                            setIsCreating(false);
                            setSelectedTicketId(ticketId);
                        }}
                        onCancel={() => setIsCreating(false)}
                    />
                </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
                {isLoading && <Spinner />}

                {!isLoading && (tickets ?? []).length === 0 && (
                    <EmptyState icon={LifeBuoy} title="No tickets" description="Nothing raised yet." />
                )}

                {(tickets ?? []).map((ticket) => {
                    const status = ticketStatusDisplay(ticket.status);

                    return (
                        <button key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className="block w-full text-left">
                            <Card className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-ink-900">{ticket.subject}</p>
                                    <p className="text-sm text-ink-600">
                                        {ticket.student?.name}
                                        {ticket.course && ` — ${ticket.course.title}`}
                                    </p>
                                </div>
                                <Badge label={status.label} tone={status.tone} icon={status.icon} />
                            </Card>
                        </button>
                    );
                })}
            </div>

            {selectedTicketId && selectedTicket && (
                <Modal isOpen onClose={closeTicket} title={selectedTicket.subject}>
                    <TicketConversation ticket={selectedTicket} />
                </Modal>
            )}
        </div>
    );
}
