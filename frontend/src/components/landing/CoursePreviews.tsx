import { Link } from 'react-router';
import { BookOpen, SignalHigh } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCourses } from '@/features/catalogue/useCourses';

const levelLabel: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function CoursePreviews() {
  const { data, isLoading } = useCourses({ status: 'published' });
  const courses = data?.data ?? [];

  return (
    <section id="courses" className="border-t border-[#e8ecf1] bg-[#eff6ff] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Course previews</p>
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
          <p className="text-center text-sm text-[#64748b]">No courses available yet.</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="transform rounded-3xl border border-blue-100 bg-blue-50 p-0 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <CardHeader className="space-y-4 p-6">
                <Badge
                  label={course.category?.name ?? 'Course'}
                  tone="progress"
                  className="border border-blue-100 bg-blue-50 text-blue-600"
                />
                <div className="space-y-2">
                  <CardTitle>{course.title}</CardTitle>
                  <CardDescription>
                    {course.description ?? 'No description available.'}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6 pt-0">
                <div className="space-y-3 text-sm text-[#64748b]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <SignalHigh className="size-4" aria-hidden="true" />
                    </span>
                    <span>{levelLabel[course.level] ?? course.level}</span>
                  </div>
                  {course.instructors.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <BookOpen className="size-4" aria-hidden="true" />
                      </span>
                      <span>{course.instructors[0].name}</span>
                    </div>
                  )}
                </div>

                <Link
                  to={`/courses/${course.id}`}
                  className="inline-flex w-full items-center justify-center rounded-md border border-blue-200 bg-surface-0 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900"
                >
                  View Course
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
