import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CourseCard } from '@/features/catalogue/CourseCard';
import { courseImageMap, courseDurationMap } from '@/features/catalogue/courseImages';
import { cn } from '@/lib/utils';
import type { Course } from '@/lib/api/types';

interface CourseCarouselProps {
    courses: Course[];
}

export function CourseCarousel({ courses }: CourseCarouselProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        slidesToScroll: 1,
        breakpoints: {
            // ≥1024px → 3 visible (handled via CSS width below)
            // ≥640px  → 2 visible
            // <640px  → 1 visible
        },
    });

    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setCanScrollPrev(emblaApi.canScrollPrev());
        setCanScrollNext(emblaApi.canScrollNext());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        setScrollSnaps(emblaApi.scrollSnapList());
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
            emblaApi.off('reInit', onSelect);
        };
    }, [emblaApi, onSelect]);

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
    const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

    return (
        <div className="relative">
            {/* Viewport — Embla requires overflow:hidden on this element */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-5">
                    {courses.map((course) => {
                        const meta = courseDurationMap[course.slug];
                        return (
                            <div
                                key={course.id}
                                // min-w-0 prevents flex children from overflowing
                                // Width: 1 card on mobile, 2 on sm, 3 on lg
                                className="min-w-0 shrink-0 grow-0 basis-full sm:basis-[calc(50%-10px)] lg:basis-[calc(33.333%-14px)]"
                            >
                                <CourseCard
                                    course={course}
                                    imageSrc={courseImageMap[course.slug]}
                                    duration={meta?.duration}
                                    format={meta?.format}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Prev / Next buttons */}
            <button
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                aria-label="Previous"
                className={cn(
                    'absolute -left-5 top-1/2 -translate-y-1/2 z-10',
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    'border border-[#e8ecf1] bg-white shadow-md',
                    'transition hover:bg-blue-50 hover:border-blue-300',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                )}
            >
                <ChevronLeft className="size-5 text-ink-700" aria-hidden="true" />
            </button>

            <button
                onClick={scrollNext}
                disabled={!canScrollNext}
                aria-label="Next"
                className={cn(
                    'absolute -right-5 top-1/2 -translate-y-1/2 z-10',
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    'border border-[#e8ecf1] bg-white shadow-md',
                    'transition hover:bg-blue-50 hover:border-blue-300',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                )}
            >
                <ChevronRight className="size-5 text-ink-700" aria-hidden="true" />
            </button>

            {/* Dot indicators */}
            {scrollSnaps.length > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                    {scrollSnaps.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => scrollTo(index)}
                            aria-label={`Go to slide ${index + 1}`}
                            className={cn(
                                'h-2 rounded-full transition-all duration-300',
                                index === selectedIndex
                                    ? 'w-6 bg-blue-600'
                                    : 'w-2 bg-[#cbd5e1] hover:bg-blue-300',
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
