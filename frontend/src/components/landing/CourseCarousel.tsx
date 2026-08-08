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
        <div className="flex flex-col gap-6">
            {/* Viewport — Embla requires overflow:hidden on this element */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-5">
                    {courses.map((course) => {
                        const meta = courseDurationMap[course.slug];
                        return (
                            <div
                                key={course.id}
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

            {/* Controls row: arrows on left, dots in the middle (or centered together) */}
            <div className="flex items-center justify-center gap-4">
                {/* Prev button */}
                <button
                    onClick={scrollPrev}
                    disabled={!canScrollPrev}
                    aria-label="Previous"
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full',
                        'border border-[#e8ecf1] bg-white shadow-sm',
                        'transition hover:border-blue-400 hover:bg-blue-50',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                    )}
                >
                    <ChevronLeft className="size-4 text-[#475569]" aria-hidden="true" />
                </button>

                {/* Dot indicators */}
                {scrollSnaps.length > 1 && (
                    <div className="flex items-center gap-2">
                        {scrollSnaps.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => scrollTo(index)}
                                aria-label={`Go to slide group ${index + 1}`}
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

                {/* Next button */}
                <button
                    onClick={scrollNext}
                    disabled={!canScrollNext}
                    aria-label="Next"
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full',
                        'border border-[#e8ecf1] bg-white shadow-sm',
                        'transition hover:border-blue-400 hover:bg-blue-50',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                    )}
                >
                    <ChevronRight className="size-4 text-[#475569]" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
