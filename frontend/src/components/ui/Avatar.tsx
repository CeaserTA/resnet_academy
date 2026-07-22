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
    size?: 'sm' | 'lg';
    className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
    sm: 'size-9 text-sm',
    lg: 'size-12 text-base',
};

export function Avatar({ name, size = 'sm', className }: AvatarProps) {
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
