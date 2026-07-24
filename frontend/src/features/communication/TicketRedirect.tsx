import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';

/**
 * `/tickets/:id` no longer has its own page (superseded by the table + side-panel view in
 * `TicketsPage.tsx`, same precedent as retiring `/forum-threads/:id`) — this keeps any existing
 * link to a specific ticket working by forwarding to `/tickets` with that ticket pre-selected.
 */
export function TicketRedirect() {
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        navigate(`/tickets?ticket=${id}`, { replace: true });
    }, [id, navigate]);

    return <Spinner />;
}
