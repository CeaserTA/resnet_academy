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

export function Avatar({ name, src, size = 'sm', className }: AvatarProps) {
    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className={cn('shrink-0 rounded-full object-cover', sizeClasses[size], className)}
                onError={(e) => {
                    // Falls back to the initials circle by hiding the broken image — the parent
                    // still renders a stable-sized element either way.
                    e.currentTarget.style.display = 'none';
                }}
            />
        );
    }

    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full font-medium text-white',
                sizeClasses[size],
                avatarTone(name),
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}
