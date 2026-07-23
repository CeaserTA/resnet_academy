import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth/AuthContext';
import { ticketStatusDisplay } from '@/lib/statusBadge';
import { useReplyToTicket, useTicket, useUpdateTicket } from '@/features/communication/useCommunication';
import type { TicketStatus } from '@/lib/api/types';

const statusOptions: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

export function TicketDetailPage() {
    const { id } = useParams();
    const ticketId = Number(id);
    const { user } = useAuth();
    const { data: ticket, isLoading } = useTicket(ticketId);
    const reply = useReplyToTicket(ticketId);
    const updateTicket = useUpdateTicket(ticketId);
    const [body, setBody] = useState('');

    if (isLoading || !ticket) {
        return <Spinner />;
    }

    const isStaff = user?.role === 'admin' || user?.role === 'instructor';
    const status = ticketStatusDisplay(ticket.status);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) {
            return;
        }
        await reply.mutateAsync(body);
        setBody('');
    };

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <Link to="/tickets" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to tickets
            </Link>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl">{ticket.subject}</h1>
                    <p className="text-sm text-ink-600">
                        {ticket.student?.name}
                        {ticket.course && ` — ${ticket.course.title}`}
                    </p>
                </div>
                <Badge label={status.label} tone={status.tone} icon={status.icon} />
            </div>

            {isStaff && (
                <Card className="flex items-center gap-3">
                    <Select
                        label="Status"
                        value={ticket.status}
                        onChange={(e) => updateTicket.mutate({ status: e.target.value })}
                        className="max-w-xs"
                    >
                        {statusOptions.map((option) => (
                            <option key={option} value={option}>
                                {ticketStatusDisplay(option).label}
                            </option>
                        ))}
                    </Select>
                    {!ticket.assigned_to && (
                        <Button
                            variant="secondary"
                            onClick={() => user && updateTicket.mutate({ assigned_to: user.id })}
                            className="mt-6"
                        >
                            Assign to me
                        </Button>
                    )}
                    {ticket.assigned_to && <p className="mt-6 text-sm text-ink-600">Assigned to {ticket.assigned_to.name}</p>}
                </Card>
            )}

            <div className="flex flex-col gap-2">
                {ticket.messages.map((message) => (
                    <Card key={message.id}>
                        <p className="text-sm font-medium text-ink-900">{message.sender?.name}</p>
                        <p className="mt-1 text-sm text-ink-900">{message.body}</p>
                        <p className="mt-1 text-xs text-ink-600">{new Date(message.created_at).toLocaleString()}</p>
                    </Card>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <Textarea label="Reply" rows={3} value={body} onChange={(e) => setBody(e.target.value)} required />
                <Button type="submit" isLoading={reply.isPending} className="self-start">
                    Send
                </Button>
            </form>
        </div>
    );
}
