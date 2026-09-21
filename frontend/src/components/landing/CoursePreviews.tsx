import { Link } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { CourseCarousel } from '@/components/landing/CourseCarousel';
import { useCourses } from '@/features/catalogue/useCourses';
import { usePublicCohortOfferings } from '@/features/cohorts/useCohorts';

export function CoursePreviews() {
  const { data, isLoading: coursesLoading } = useCourses({ status: 'published' });
  const { data: cohortOfferings, isLoading: offeringsLoading } = usePublicCohortOfferings();
  const isLoading = coursesLoading || offeringsLoading;

  const courseIdsWithCohorts = new Set(
    (cohortOfferings ?? []).map((offering) => offering.course.id),
  );
  // Show up to 6 on homepage — carousel handles scrolling when there are more
  const courses = (data?.data ?? [])
    .filter((c) => courseIdsWithCohorts.has(c.id))
    .slice(0, 6);

  return (
    <section id="courses" className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ── Heading row ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Course Previews
            </p>
            <h2 className="mt-2 text-3xl text-ink-900 sm:text-4xl">
              Learn the skills that move careers forward.
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Practical pathways built for real project readiness, not certificates alone.
            </p>
          </div>
          <Link
            to="/courses"
            className="shrink-0 self-start rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink-900 transition-colors hover:border-primary hover:text-primary sm:self-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            All courses
          </Link>
        </div>

        {/* ── Carousel ── */}
        <div className="mt-8">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          )}

          {!isLoading && courses.length === 0 && (
            <p className="py-12 text-center text-sm text-ink-300">No courses available yet.</p>
          )}

          {!isLoading && courses.length > 0 && (
            <CourseCarousel courses={courses} />
          )}
        </div>

      </div>
    </section>
  );
}
