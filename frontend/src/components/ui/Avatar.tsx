import * as RadixAvatar from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const AVATAR_TONES = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-violet-600'];

function avatarTone(name: string): string {
    const index = name.charCodeAt(0) % AVATAR_TONES.length;
    return AVATAR_TONES[index];
}

function initials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

interface AvatarProps {
    name: string;
    /** When present, renders the image instead of initials — falls back to initials on load error. */
    src?: string | null;
    size?: 'sm' | 'lg';
    className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
    sm: 'size-9 text-sm',
    lg: 'size-12 text-base',
};

/**
 * Built on Radix's Avatar so a slow/broken `src` falls back to the initials circle via Radix's
 * documented image-load-state handling, rather than a manual `onError` DOM hide — same visual
 * result, no flash of a broken-image icon first.
 */
export function Avatar({ name, src, size = 'sm', className }: AvatarProps) {
    return (
        <RadixAvatar.Root className={cn('flex shrink-0 items-center justify-center rounded-full', sizeClasses[size], className)}>
            {src && <RadixAvatar.Image src={src} alt={name} className="size-full rounded-full object-cover" />}
            <RadixAvatar.Fallback
                className={cn('flex size-full items-center justify-center rounded-full font-medium text-white', avatarTone(name))}
            >
                {initials(name)}
            </RadixAvatar.Fallback>
        </RadixAvatar.Root>
    );
}
