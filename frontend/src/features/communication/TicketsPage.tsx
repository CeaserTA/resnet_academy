import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { LifeBuoy, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCreateTicket, useTickets } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';
import { ticketStatusDisplay } from '@/lib/statusBadge';
import { ApiError } from '@/lib/api/client';

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
    const navigate = useNavigate();

    return (
        <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">{user?.role === 'student' ? 'Support' : 'Support tickets'}</h1>
                {user?.role === 'student' && !isCreating && (
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="size-4" aria-hidden="true" />
                        New ticket
                    </Button>
                )}
            </div>

            {isCreating && (
                <div className="mt-4">
                    <NewTicketForm
                        onCreated={(ticketId) => navigate(`/tickets/${ticketId}`)}
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
                        <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
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
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
