import { Spinner } from '@/components/ui/Spinner';
import { CourseCard } from '@/features/catalogue/CourseCard';
import { useCourses } from '@/features/catalogue/useCourses';

/** Maps a course slug to its local image in /public/images/. */
const courseImageMap: Record<string, string> = {
  'web-foundations': '/images/web_foundations.jpg',
  'dynamic-web': '/images/dynamic_web.jpg',
  'full-stack': '/images/full_stack.jpg',
  'search-engine-optimization': '/images/SEO.jpg',
  'progressive-web-app-development': '/images/PWA.jpg',
  'vuejs-and-laravel': '/images/VUE.JS_LARAVEL.jpg',
};

export function CoursePreviews() {
  const { data, isLoading } = useCourses({ status: 'published' });
  const courses = data?.data ?? [];

  return (
    <section id="courses" className="border-t border-[#e8ecf1] bg-[#eff6ff] px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
            Course previews
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Learn the skills that move careers forward.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#64748b] sm:text-lg">
            Explore course pathways designed for practical skill growth and real project readiness.
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center">
            <Spinner />
          </div>
        )}

        {!isLoading && courses.length === 0 && (
          <p className="text-center text-sm text-[#94a3b8]">No courses available yet.</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              imageSrc={courseImageMap[course.slug]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
