import { useRef, useEffect } from 'react';

interface Point {
    x: number;
    y: number;
    vx: number;
    vy: number;
    wanderOffset: number;
    speedMult: number;
}

interface MeshBackgroundProps {
    /** Background fill color — defaults to navy token value */
    backgroundColor?: string;
    /** Line/node color — defaults to a soft blue */
    meshColor?: string;
    particleCount?: number;
    connectionDistance?: number;
    flowSpeed?: number;
    particleSpeed?: number;
    lineWidth?: number;
    nodeSize?: number;
    className?: string;
}

export function MeshBackground({
    backgroundColor = 'oklch(0.38 0.15 264)',
    meshColor = 'rgba(147, 197, 253, 0.6)', // blue-200 at 60% — soft on navy
    particleCount = 80,
    connectionDistance = 130,
    flowSpeed = 1,
    particleSpeed = 0.3,
    lineWidth = 0.8,
    nodeSize = 1.5,
    className,
}: MeshBackgroundProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const pointsRef = useRef<Point[]>([]);
    const mouseRef = useRef({ x: -9999, y: -9999 });

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let resizeObserver: ResizeObserver;

        const initParticles = () => {
            cancelAnimationFrame(animationRef.current);
            const width = container.offsetWidth;
            const height = container.offsetHeight;
            if (width <= 0 || height <= 0) return;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, width * dpr);
            canvas.height = Math.max(1, height * dpr);
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            pointsRef.current = Array.from({ length: particleCount }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: 0,
                vy: 0,
                wanderOffset: Math.random() * Math.PI * 2,
                speedMult: 0.5 + Math.random(),
            }));

            let time = 0;

            const animate = () => {
                time += 0.01 * flowSpeed;
                ctx.globalAlpha = 1;
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, width, height);

                const points = pointsRef.current;

                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    p.x += Math.sin(time * p.speedMult + p.wanderOffset) * particleSpeed;
                    p.y += Math.cos(time * p.speedMult + p.wanderOffset) * particleSpeed;
                    if (p.x > width + 50) p.x = -50;
                    if (p.x < -50) p.x = width + 50;
                    if (p.y > height + 50) p.y = -50;
                    if (p.y < -50) p.y = height + 50;
                }

                // Draw connections — Cybernetic Circuits style (right-angle lines)
                ctx.lineCap = 'square';
                for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    for (let j = i + 1; j < points.length; j++) {
                        const p2 = points[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < connectionDistance) {
                            const opacity = (1 - dist / connectionDistance) * 0.6;
                            ctx.globalAlpha = opacity;
                            ctx.strokeStyle = meshColor;
                            ctx.lineWidth = lineWidth;
                            // Right-angle path: horizontal then vertical
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p1.y); // go horizontal first
                            ctx.lineTo(p2.x, p2.y); // then vertical
                            ctx.stroke();
                        }
                    }

                    // Draw square nodes at corners
                    if (nodeSize > 0) {
                        ctx.globalAlpha = 0.85;
                        ctx.fillStyle = meshColor;
                        ctx.beginPath();
                        ctx.arc(p1.x, p1.y, nodeSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                animationRef.current = requestAnimationFrame(animate);
            };

            animate();
        };

        resizeObserver = new ResizeObserver(() => initParticles());
        resizeObserver.observe(container);
        initParticles();

        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationRef.current);
        };
    }, [backgroundColor, meshColor, particleCount, connectionDistance, flowSpeed, particleSpeed, lineWidth, nodeSize]);

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 overflow-hidden ${className ?? ''}`}
            onPointerMove={(e) => {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            }}
            onPointerLeave={() => { mouseRef.current = { x: -9999, y: -9999 }; }}
            aria-hidden="true"
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}
