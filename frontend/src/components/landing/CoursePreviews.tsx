import { Clock3, SignalHigh } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const courses = [
  {
    category: 'Frontend',
    title: 'Frontend Development',
    description: 'HTML5/CSS3, JavaScript ES6+, responsive design, and Bootstrap fundamentals.',
    duration: '6 weeks',
    level: 'Beginner to Advanced',
  },
  {
    category: 'Backend',
    title: 'Backend Development',
    description: 'PHP/Laravel, MySQL, and REST API architecture for real-world applications.',
    duration: '8 weeks',
    level: 'Intermediate to Advanced',
  },
  {
    category: 'Specialized',
    title: 'Specialized Skills',
    description: 'SEO, analytics, WordPress, and database optimization for modern teams.',
    duration: '4-6 weeks',
    level: 'All Levels',
  },
];

interface CoursePreviewsProps {
  onViewCourseClick: () => void;
}

export function CoursePreviews({ onViewCourseClick }: CoursePreviewsProps) {
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

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(({ category, title, description, duration, level }) => (
            <Card
              key={title}
              className="transform rounded-3xl border border-blue-100 bg-blue-50 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <CardHeader className="space-y-4 p-6">
                <Badge
                  label={category}
                  tone="progress"
                  className="border border-blue-100 bg-blue-50 text-blue-600"
                />
                <div className="space-y-2">
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6 pt-0">
                <div className="space-y-3 text-sm text-[#64748b]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Clock3 className="size-4" aria-hidden="true" />
                    </span>
                    <span>{duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <SignalHigh className="size-4" aria-hidden="true" />
                    </span>
                    <span>{level}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900"
                  onClick={onViewCourseClick}
                >
                  View Course
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
