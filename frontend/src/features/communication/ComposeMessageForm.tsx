import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/client';
import { useContactableUsers, useStartConversation } from '@/features/communication/useCommunication';

interface ComposeMessageFormProps {
    onSent: (conversationId: number) => void;
    onCancel: () => void;
}

export function ComposeMessageForm({ onSent, onCancel }: ComposeMessageFormProps) {
    const { data: contacts } = useContactableUsers();
    const [recipientId, setRecipientId] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | null>(null);
    const startConversation = useStartConversation();

    // Defaults to the first contact once loaded, without needing an effect: the value falls
    // back to the first contact's id whenever no explicit selection has been made yet.
    const selectedRecipientId = recipientId || String(contacts?.[0]?.id ?? '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const conversation = await startConversation.mutateAsync({
                recipient_id: Number(selectedRecipientId),
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
            <div className="rounded-md border border-surface-100 bg-surface-50 p-4 text-sm text-ink-600">
                There's no one you're able to message yet.
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-md border border-surface-100 bg-surface-50 p-4"
        >
            {error && <Alert variant="error" message={error} />}

            <Select label="To" value={selectedRecipientId} onChange={(e) => setRecipientId(e.target.value)}>
                {(contacts ?? []).map((contact) => (
                    <option key={contact.id} value={contact.id}>
                        {contact.name} ({contact.role})
                    </option>
                ))}
            </Select>

            <Input label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea label="Message" rows={3} value={body} onChange={(e) => setBody(e.target.value)} required />

            <div className="flex gap-2">
                <Button type="submit" isLoading={startConversation.isPending}>
                    Send
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
