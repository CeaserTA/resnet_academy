import {
  Award,
  BellRing,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const features = [
  {
    title: 'Course management',
    description:
      'Build and organize courses with rich media, modules, and customizable paths for every learner.',
    Icon: BookOpen,
  },
  {
    title: 'Progress tracking',
    description:
      'Monitor learner activity, completion rates, and milestones across every course and cohort.',
    Icon: TrendingUp,
  },
  {
    title: 'Certificates',
    description:
      'Issue certificates automatically upon completion so learners can celebrate and share achievements.',
    Icon: Award,
  },
  {
    title: 'Discussion forums',
    description:
      'Keep conversations organized with threaded forums, course discussions, and instructor Q&A.',
    Icon: MessageSquare,
  },
  {
    title: 'Assignments & grading',
    description:
      'Create assessments, collect submissions, and deliver feedback with a streamlined grading workflow.',
    Icon: ClipboardCheck,
  },
  {
    title: 'Messaging & alerts',
    description:
      'Enable inbox messaging, ticket updates, and notifications so users stay connected.',
    Icon: BellRing,
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-[#e8ecf1] bg-[#fafbfc] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Key capabilities</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Everything your learning ecosystem needs.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#94a3b8] sm:text-lg">
            From course publishing to learner progress, assessments, and communications, this LMS gives admins and students a single collaborative experience.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {features.map(({ title, description, Icon }) => (
            <Card
              key={title}
              className="transform p-0 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
