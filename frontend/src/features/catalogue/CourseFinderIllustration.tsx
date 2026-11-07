import {
    CirclePlay,
    ClipboardCheck,
    CircleHelp,
    GraduationCap,
    MessagesSquare,
    NotebookPen,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Course Finder hero art: an isometric laptop playing a lesson, a graduation cap on its
 * corner, and the learning journey as icons riding a dotted arc. Theme tokens only; motion
 * (flowing arc, floating icons, glowing play button) is dropped under prefers-reduced-motion
 * via `data-reduce-motion`.
 */

// Isometric axes: u runs right-down, v runs left-down (30° from horizontal).
const U = [0.866, 0.5] as const;
const V = [-0.866, 0.5] as const;

// Deck (keyboard half) — back-left corner A, 160 along u, 110 along v.
const A = [230, 235] as const;
const pt = (base: readonly [number, number], du: number, dv: number) =>
    [base[0] + U[0] * du + V[0] * dv, base[1] + U[1] * du + V[1] * dv] as const;
const B = pt(A, 160, 0);
const C = pt(A, 160, 110);
const D = pt(A, 0, 110);
const THICK = 7;
const poly = (...pts: (readonly [number, number])[]) => pts.map(([x, y]) => `${x},${y}`).join(' ');

// Screen rises 130 from the hinge (A→B), tilted slightly back.
const SCREEN_H = 130;
const TILT = 18;
const At = [A[0] - V[0] * TILT, A[1] - SCREEN_H - V[1] * TILT] as const;
const Bt = [B[0] - V[0] * TILT, B[1] - SCREEN_H - V[1] * TILT] as const;
// Maps flat screen coords (x 0–160, y 0–130 top→bottom) onto the tilted screen face.
const screenMatrix = `matrix(${U[0]} ${U[1]} ${(A[0] - At[0]) / SCREEN_H} ${(A[1] - At[1]) / SCREEN_H} ${At[0]} ${At[1]})`;
// Maps flat deck coords (x 0–160 along u, y 0–110 along v) onto the deck.
const deckMatrix = `matrix(${U[0]} ${U[1]} ${V[0]} ${V[1]} ${A[0]} ${A[1]})`;

// Journey icons on an arc centred under the laptop (skipping straight-up, where the cap sits).
const ARC = { cx: 240, cy: 250, r: 200 };
const ORBIT: { icon: LucideIcon; angle: number }[] = [
    { icon: Users, angle: 170 },
    { icon: CirclePlay, angle: 145 },
    { icon: MessagesSquare, angle: 118 },
    { icon: NotebookPen, angle: 90 },
    { icon: CircleHelp, angle: 62 },
    { icon: ClipboardCheck, angle: 35 },
    { icon: GraduationCap, angle: 10 },
];

export function CourseFinderIllustration({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 480 400"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('w-full', className)}
            aria-hidden="true"
            data-reduce-motion
        >
            {/* Soft glow + floor shadow */}
            <circle cx="240" cy="235" r="165" className="fill-blue-600/25" />
            <ellipse cx="252" cy="352" rx="150" ry="36" className="fill-blue-900/40" />

            {/* Dotted journey arc — dots flow along it */}
            <path
                d={`M${ARC.cx - ARC.r},${ARC.cy} A${ARC.r},${ARC.r} 0 0 1 ${ARC.cx + ARC.r},${ARC.cy}`}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="0.5 8.5"
                className="animate-dash-flow stroke-white/50"
            />

            {ORBIT.map(({ icon: Icon, angle }, i) => {
                const rad = (angle * Math.PI) / 180;
                const x = ARC.cx + ARC.r * Math.cos(rad);
                const y = ARC.cy - ARC.r * Math.sin(rad);
                return (
                    <g key={angle} className="animate-float" style={{ animationDelay: `${i * -0.55}s` }}>
                        <circle cx={x} cy={y} r="22" className="fill-navy stroke-white/20" strokeWidth="1" />
                        <Icon
                            x={x - 12}
                            y={y - 12}
                            width={24}
                            height={24}
                            strokeWidth={1.6}
                            className={angle === 10 ? 'text-amber-500' : 'text-white'}
                        />
                    </g>
                );
            })}

            {/* ── Laptop ─────────────────────────────────────────────────── */}
            {/* Deck sides (thickness) */}
            <polygon points={poly(D, C, [C[0], C[1] + THICK], [D[0], D[1] + THICK])} className="fill-blue-400" />
            <polygon points={poly(C, B, [B[0], B[1] + THICK], [C[0], C[1] + THICK])} className="fill-blue-600" />
            {/* Deck top */}
            <polygon points={poly(A, B, C, D)} className="fill-blue-100" />
            <g transform={deckMatrix}>
                {Array.from({ length: 4 }, (_, row) =>
                    Array.from({ length: 12 }, (_, col) => (
                        <rect
                            key={`${row}-${col}`}
                            x={12 + col * 11.5}
                            y={12 + row * 11}
                            width="9"
                            height="8"
                            rx="1.5"
                            className="fill-blue-900/25"
                        />
                    )),
                )}
                <rect x="40" y="56" width="80" height="8" rx="1.5" className="fill-blue-900/25" />
                <rect x="55" y="72" width="50" height="28" rx="3" className="fill-surface-0/70 stroke-blue-400/40" strokeWidth="1" />
            </g>

            {/* Screen */}
            <polygon points={poly(A, B, Bt, At)} className="fill-blue-900 stroke-blue-100" strokeWidth="2" strokeLinejoin="round" />
            <g transform={screenMatrix}>
                <rect x="7" y="7" width="146" height="113" rx="3" className="fill-blue-600" />
                {/* Browser bar */}
                <rect x="7" y="7" width="146" height="12" rx="3" className="fill-blue-700" />
                {[13, 19, 25].map((cx) => (
                    <circle key={cx} cx={cx} cy="13" r="1.6" className="fill-surface-0/60" />
                ))}
                {/* Video panel + play button */}
                <rect x="14" y="25" width="94" height="60" rx="3" className="fill-blue-900/60" />
                <circle cx="61" cy="55" r="15" className="animate-glow fill-amber-500" />
                <polygon points="56,47 56,63 69,55" className="fill-surface-0" />
                {/* Lesson sidebar */}
                {[
                    [27, 34],
                    [37, 28],
                    [47, 34],
                    [57, 22],
                    [67, 30],
                ].map(([y, w]) => (
                    <rect key={y} x="114" y={y} width={w} height="5" rx="2" className="fill-surface-0/35" />
                ))}
                {/* Captions + progress */}
                <rect x="14" y="93" width="70" height="5" rx="2" className="fill-surface-0/45" />
                <rect x="14" y="102" width="48" height="5" rx="2" className="fill-surface-0/25" />
                <rect x="14" y="111" width="132" height="3" rx="1.5" className="fill-surface-0/20" />
                <rect x="14" y="111" width="80" height="3" rx="1.5" className="fill-amber-500" />
            </g>

            {/* Graduation cap resting on the screen's corner */}
            <g transform={`translate(${At[0] - 42} ${At[1] - 30}) rotate(-10)`} strokeLinejoin="round">
                <path d="M16,24 L16,36 Q34,48 52,36 L52,24" className="fill-blue-900 stroke-surface-0" strokeWidth="2" />
                <polygon points="0,18 34,2 68,18 34,34" className="fill-blue-900 stroke-surface-0" strokeWidth="2" />
                <polyline points="34,18 60,26 60,42" fill="none" className="stroke-amber-500" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="60" cy="44" r="3" className="fill-amber-500" />
            </g>
        </svg>
    );
}
