import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    Eye,
    LifeBuoy,
    Plus,
    X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { SearchInput } from '@/components/ui/SearchInput';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { TicketConversation } from '@/features/communication/TicketConversation';
import { updateTicket } from '@/features/communication/api';
import { useCreateTicket, useTicket, useTickets } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { ApiError } from '@/lib/api/client';
import { ticketStatusDisplay } from '@/lib/statusBadge';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Ticket, TicketStatus } from '@/lib/api/types';
import { PageFrame } from '@/components/layout/PageFrame';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';

// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUS_TABS: { value: TicketStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
];

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

// ─── Inline status badge — click to change ────────────────────────────────────

function StatusBadge({
    ticket,
    onStatusChange,
}: {
    ticket: Ticket;
    onStatusChange: (status: string) => void;
}) {
    const current = ticketStatusDisplay(ticket.status);

    return (
        <DropdownMenu
            align="left"
            trigger={(toggle) => (
                <button
                    onClick={(e) => { e.stopPropagation(); toggle(); }}
                    className="flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-blue-600"
                    aria-label={`Change status — currently ${current.label}`}
                >
                    <Badge label={current.label} tone={current.tone} icon={current.icon} />
                    <ChevronDown className="size-3 text-ink-600" aria-hidden="true" />
                </button>
            )}
            items={STATUS_OPTIONS.filter((s) => s !== ticket.status).map((s) => {
                const d = ticketStatusDisplay(s);
                return {
                    label: d.label,
                    icon: d.icon,
                    onClick: () => onStatusChange(s),
                };
            })}
        />
    );
}

// ─── Sortable column header ───────────────────────────────────────────────────

function SortHeader({
    label,
    active,
    dir,
    onClick,
}: {
    label: string;
    active: boolean;
    dir: SortDir;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wide text-ink-600 hover:text-ink-900"
        >
            {label}
            {active ? (
                dir === 'asc'
                    ? <ChevronUp className="size-3" aria-hidden="true" />
                    : <ChevronDown className="size-3" aria-hidden="true" />
            ) : (
                <ArrowUpDown className="size-3 text-ink-300" aria-hidden="true" />
            )}
        </button>
    );
}

// ─── New ticket form (student) ────────────────────────────────────────────────

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-surface-100 bg-surface-0 p-4">
            {error && <Alert variant="error" message={error} />}
            <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <Textarea
                label="Describe the issue"
                rows={4}
                className="text-sm"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
            />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={createTicket.isPending} disabled={!subject.trim() || !body.trim()}>
                    Submit ticket
                </Button>
            </div>
        </form>
    );
}

// ─── Full table (no ticket open) ──────────────────────────────────────────────

const TABLE_COLUMNS = 'grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_120px_60px_100px]';

function TicketTable({
    tickets,
    sortDir,
    onToggleSort,
    onSelect,
    onStatusChange,
}: {
    tickets: Ticket[];
    sortDir: SortDir;
    onToggleSort: () => void;
    onSelect: (id: number) => void;
    onStatusChange: (id: number, status: string) => void;
}) {
    return (
        /* Scrolls sideways on narrow screens instead of clipping columns */
        <div className="overflow-x-auto">
            <div className="min-w-[670px]">
                <div className={cn('grid items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5', TABLE_COLUMNS)}>
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Subject</span>
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Status</span>
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-600">View</span>
                    <SortHeader label="Time" active={true} dir={sortDir} onClick={onToggleSort} />
                </div>

                <ul className="divide-y divide-surface-100">
                    {tickets.map((ticket) => (
                        <li
                            key={ticket.id}
                            onClick={() => onSelect(ticket.id)}
                            className={cn('grid cursor-pointer items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-50', TABLE_COLUMNS)}
                        >
                            {/* Student */}
                            <div className="flex min-w-0 items-center gap-2">
                                {ticket.student ? (
                                    <>
                                        <Avatar
                                            name={ticket.student.name}
                                            src={ticket.student.avatar_url}
                                            size="sm"
                                            className="size-7 shrink-0 text-xs"
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-ink-900">{ticket.student.name}</p>
                                            <p className="truncate text-xs text-ink-600">{ticket.student.email}</p>
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-sm text-ink-600">—</span>
                                )}
                            </div>

                            {/* Subject + course */}
                            <div className="min-w-0">
                                <p className="truncate text-sm text-ink-900">{ticket.subject}</p>
                                {ticket.course && <p className="truncate text-xs text-ink-600">{ticket.course.title}</p>}
                            </div>

                            {/* Status badge — click to change */}
                            <div onClick={(e) => e.stopPropagation()}>
                                <StatusBadge ticket={ticket} onStatusChange={(status) => onStatusChange(ticket.id, status)} />
                            </div>

                            {/* View button */}
                            <div onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => onSelect(ticket.id)}
                                    aria-label={`View ticket: ${ticket.subject}`}
                                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-600 transition-colors hover:bg-surface-100 hover:text-blue-600"
                                >
                                    <Eye className="size-4" aria-hidden="true" />
                                </button>
                            </div>

                            {/* Time */}
                            <span className="shrink-0 text-xs tabular-nums text-ink-600">
                                {formatRelativeTime(ticket.created_at)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// ─── Compact list (a ticket is open beside it) ────────────────────────────────

function CompactTicketList({
    tickets,
    selectedId,
    onSelect,
    onStatusChange,
}: {
    tickets: Ticket[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onStatusChange: (id: number, status: string) => void;
}) {
    return (
        <ul className="divide-y divide-surface-100">
            {tickets.map((ticket) => {
                const isSelected = ticket.id === selectedId;
                return (
                    <li
                        key={ticket.id}
                        className={cn(
                            'flex items-center gap-2 border-l-2 pr-3 transition-colors',
                            isSelected ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:bg-surface-50',
                        )}
                    >
                        <button
                            onClick={() => onSelect(ticket.id)}
                            aria-current={isSelected ? 'true' : undefined}
                            className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-3 text-left"
                        >
                            {ticket.student && (
                                <Avatar
                                    name={ticket.student.name}
                                    src={ticket.student.avatar_url}
                                    size="sm"
                                    className="size-7 shrink-0 text-xs"
                                />
                            )}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-ink-900">
                                    {ticket.student?.name ?? 'Unknown student'}
                                </span>
                                <span className="block truncate text-xs text-ink-600">{ticket.subject}</span>
                            </span>
                        </button>
                        <div className="shrink-0">
                            <StatusBadge ticket={ticket} onStatusChange={(status) => onStatusChange(ticket.id, status)} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

// ─── Admin / Instructor view ──────────────────────────────────────────────────

function StaffTicketsView() {
    const { data: tickets, isLoading } = useTickets();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
        const fromQuery = searchParams.get('ticket');
        return fromQuery ? Number(fromQuery) : null;
    });
    const { data: selectedTicket } = useTicket(selectedTicketId ?? NaN);
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    usePageHeader('Support tickets', 'Review and respond to student support requests');

    const quickUpdateStatus = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) => updateTicket(id, { status }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['tickets', id] });
        },
    });

    const closePanel = () => {
        setSelectedTicketId(null);
        if (searchParams.has('ticket')) {
            searchParams.delete('ticket');
            setSearchParams(searchParams, { replace: true });
        }
    };

    const filtered = useMemo(() => {
        let list = tickets ?? [];
        if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
        if (search.trim()) {
            const term = search.trim().toLowerCase();
            list = list.filter(
                (t) =>
                    t.subject.toLowerCase().includes(term) ||
                    t.student?.name.toLowerCase().includes(term) ||
                    t.student?.email.toLowerCase().includes(term),
            );
        }
        return [...list].sort((a, b) => {
            const ta = new Date(a.created_at).getTime();
            const tb = new Date(b.created_at).getTime();
            return sortDir === 'asc' ? ta - tb : tb - ta;
        });
    }, [tickets, statusFilter, search, sortDir]);

    const isPanelOpen = selectedTicketId !== null;
    const changeStatus = (id: number, status: string) => quickUpdateStatus.mutate({ id, status });

    return (
        <div>
            <div className={cn('flex gap-4', isPanelOpen ? 'items-start' : '')}>

                {/* ── Left: table (nothing open) or compact list (a ticket is open) ── */}
                <div className={cn('min-w-0 flex-1', isPanelOpen ? 'hidden lg:block lg:w-2/5 lg:flex-none' : 'w-full')}>

                    {/* Toolbar — in the narrow state the search takes its own full-width row and the
                        tabs wrap beneath it, so neither gets clipped. */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <SearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Search subject or student…"
                            className={cn('ml-0', isPanelOpen ? 'max-w-none' : 'sm:w-72 sm:max-w-none')}
                        />

                        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-surface-100 bg-surface-50 p-0.5">
                            {STATUS_TABS.map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setStatusFilter(value)}
                                    aria-pressed={statusFilter === value}
                                    className={cn(
                                        'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                        statusFilter === value
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-ink-600 hover:text-ink-900',
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <Spinner />
                        </div>
                    )}

                    {!isLoading && filtered.length === 0 && (
                        <EmptyState
                            icon={LifeBuoy}
                            title="No tickets"
                            description={
                                (tickets ?? []).length === 0
                                    ? 'No support tickets have been raised yet.'
                                    : 'No tickets match this filter.'
                            }
                        />
                    )}

                    {!isLoading && filtered.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                            {isPanelOpen ? (
                                <CompactTicketList
                                    tickets={filtered}
                                    selectedId={selectedTicketId}
                                    onSelect={setSelectedTicketId}
                                    onStatusChange={changeStatus}
                                />
                            ) : (
                                <TicketTable
                                    tickets={filtered}
                                    sortDir={sortDir}
                                    onToggleSort={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                                    onSelect={setSelectedTicketId}
                                    onStatusChange={changeStatus}
                                />
                            )}

                            {/* Footer count */}
                            <div className="border-t border-surface-100 bg-surface-50 px-4 py-2">
                                <p className="text-xs text-ink-600">
                                    {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right: conversation panel ──────────────────────────── */}
                {selectedTicketId && (
                    <div className="w-full lg:w-3/5">
                        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                            {/* Panel header */}
                            <div className="flex items-start justify-between gap-3 border-b border-surface-100 bg-surface-50 px-4 py-3">
                                {selectedTicket ? (
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink-900">
                                            {selectedTicket.subject}
                                        </p>
                                        <p className="text-xs text-ink-600">
                                            {selectedTicket.student?.name}
                                            {selectedTicket.course && ` · ${selectedTicket.course.title}`}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-8 w-40 animate-pulse rounded bg-surface-100" />
                                )}
                                <button
                                    onClick={closePanel}
                                    aria-label="Close conversation"
                                    className="rounded-md p-1 text-ink-600 hover:bg-surface-100 hover:text-ink-900"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            </div>

                            {/* Conversation body */}
                            <div className="p-4">
                                {!selectedTicket ? (
                                    <Spinner />
                                ) : (
                                    <TicketConversation ticket={selectedTicket} />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Student view ─────────────────────────────────────────────────────────────

function StudentTicketsView() {
    const { data: tickets, isLoading } = useTickets();
    const [isCreating, setIsCreating] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
        const fromQuery = searchParams.get('ticket');
        return fromQuery ? Number(fromQuery) : null;
    });
    const { data: selectedTicket } = useTicket(selectedTicketId ?? NaN);

    const closeModal = () => {
        setSelectedTicketId(null);
        if (searchParams.has('ticket')) {
            searchParams.delete('ticket');
            setSearchParams(searchParams, { replace: true });
        }
    };

    return (
        <PageFrame
            title="Support"
            subtitle="Raise and track support requests"
            actions={
                !isCreating && (
                    <Button size="sm" onClick={() => setIsCreating(true)}>
                        <Plus className="size-3.5" aria-hidden="true" />
                        New ticket
                    </Button>
                )
            }
        >

            {isCreating && (
                <NewTicketForm
                    onCreated={(ticketId) => { setIsCreating(false); setSelectedTicketId(ticketId); }}
                    onCancel={() => setIsCreating(false)}
                />
            )}

            {isLoading && <Spinner />}

            {!isLoading && (tickets ?? []).length === 0 && (
                <EmptyState icon={LifeBuoy} title="No tickets" description="Nothing raised yet." />
            )}

            <div className="flex flex-col gap-2">
                {(tickets ?? []).map((ticket) => {
                    const status = ticketStatusDisplay(ticket.status);
                    return (
                        <button
                            key={ticket.id}
                            onClick={() => setSelectedTicketId(ticket.id)}
                            className="block w-full text-left"
                        >
                            <Card className="flex items-center justify-between gap-3 hover:border-blue-200 hover:shadow-md transition-all">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-ink-900">{ticket.subject}</p>
                                    <p className="truncate text-xs text-ink-600">
                                        {ticket.course ? ticket.course.title : 'General'}
                                        {' · '}
                                        {formatRelativeTime(ticket.created_at)}
                                    </p>
                                </div>
                                <Badge label={status.label} tone={status.tone} icon={status.icon} />
                            </Card>
                        </button>
                    );
                })}
            </div>

            {selectedTicketId && selectedTicket && (
                <Modal
                    isOpen
                    onClose={closeModal}
                    title={selectedTicket.subject}
                    titleAdornment={(() => {
                        const status = ticketStatusDisplay(selectedTicket.status);
                        return <Badge label={status.label} tone={status.tone} icon={status.icon} />;
                    })()}
                >
                    <TicketConversation ticket={selectedTicket} />
                </Modal>
            )}
        </PageFrame>
    );
}

// ─── Page entry point ─────────────────────────────────────────────────────────

export function TicketsPage() {
    const { user } = useAuth();
    const isStaff = user?.role === 'admin' || user?.role === 'instructor';
    return isStaff ? <StaffTicketsView /> : <StudentTicketsView />;
}
