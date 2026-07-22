import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
    return (
        <div className="mx-auto max-w-md px-4 py-16">
            <EmptyState
                icon={Compass}
                title="Page not found"
                description="That page doesn’t exist or may have moved."
                action={
                    <Link to="/">
                        <Button>Back to catalogue</Button>
                    </Link>
                }
            />
        </div>
    );
}
