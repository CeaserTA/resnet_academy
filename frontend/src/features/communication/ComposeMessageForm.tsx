import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';
import { matchesSearch } from '@/lib/search';
import type { User } from '@/lib/api/types';
import { useContactableUsers, useStartConversation } from '@/features/communication/useCommunication';

interface ComposeMessageFormProps {
    onSent: (conversationId: number) => void;
    onCancel: () => void;
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', instructor: 'Instructor', student: 'Student' };

function PersonLine({ person }: { person: User }) {
    return (
        <>
            <Avatar name={person.name} src={person.avatar_url} size="sm" className="size-8 shrink-0 text-xs" />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-900">{person.name}</span>
                <span className="block truncate text-xs text-ink-600">{person.email}</span>
            </span>
            <span className="shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-xs text-ink-600">
                {ROLE_LABEL[person.role] ?? person.role}
            </span>
        </>
    );
}

/**
 * Searchable recipient picker: a plain dropdown doesn't scale once an instructor has dozens of
 * students. Type to filter by name or email; the list scrolls; picking someone turns the field
 * into a chip with "Change".
 */
function RecipientPicker({
    contacts,
    isLoading,
    selected,
    onSelect,
}: {
    contacts: User[];
    isLoading: boolean;
    selected: User | null;
    onSelect: (person: User | null) => void;
}) {
    const [query, setQuery] = useState('');
    const matches = useMemo(
        () => contacts.filter((c) => matchesSearch(query, c.name, c.email)),
        [contacts, query],
    );

    if (selected) {
        return (
            <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-900">To</span>
                <div className="flex items-center gap-3 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2">
                    <PersonLine person={selected} />
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                        Change
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor="recipient-search" className="text-sm font-medium text-ink-900">To</label>
            <div className="overflow-hidden rounded-lg border border-surface-100 bg-surface-0 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                <div className="relative border-b border-surface-100">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-600" aria-hidden="true" />
                    <input
                        id="recipient-search"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or email…"
                        autoFocus
                        autoComplete="off"
                        className="w-full bg-transparent py-2.5 pl-9 pr-9 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-600 hover:bg-surface-100"
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : matches.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-ink-600">No one matches “{query}”.</p>
                ) : (
                    <ul className="max-h-60 divide-y divide-surface-100 overflow-y-auto" aria-label="People you can message">
                        {matches.map((person) => (
                            <li key={person.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(person)}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none"
                                >
                                    <PersonLine person={person} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {!isLoading && (
                <p className="text-xs text-ink-600">
                    {query ? `${matches.length} of ${contacts.length} people` : `${contacts.length} people you can message`}
                </p>
            )}
        </div>
    );
}

export function ComposeMessageForm({ onSent, onCancel }: ComposeMessageFormProps) {
    const { data: contacts, isLoading } = useContactableUsers();
    const [recipient, setRecipient] = useState<User | null>(null);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | null>(null);
    const startConversation = useStartConversation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!recipient) {
            setError('Choose who to send this to.');
            return;
        }

        try {
            const conversation = await startConversation.mutateAsync({
                recipient_id: recipient.id,
                subject: subject || undefined,
                body,
            });
            onSent(conversation.id);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not send this message.');
        }
    };

    if (contacts && contacts.length === 0) {
        return (
            <p className="rounded-lg border border-surface-100 bg-surface-50 p-4 text-sm text-ink-600">
                There's no one you're able to message yet.
            </p>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <Alert variant="error" message={error} />}

            <RecipientPicker contacts={contacts ?? []} isLoading={isLoading} selected={recipient} onSelect={setRecipient} />

            <Input label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea label="Message" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />

            <div className="-mx-5 -mb-4 flex justify-end gap-2 border-t border-surface-100 bg-surface-50 px-5 py-3.5">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={startConversation.isPending} disabled={!recipient || !body.trim()}>
                    Send
                </Button>
            </div>
        </form>
    );
}
