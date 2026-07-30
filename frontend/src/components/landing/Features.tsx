import { Award, Bell, BookOpen, ClipboardCheck, MessageSquare, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Build real projects',
    description:
      'Every module ends with a project you build, deploy, and can show an employer — not a toy exercise, a real piece of work.',
  },
  {
    icon: TrendingUp,
    title: 'Track your progress',
    description:
      'See exactly where you are at every stage — which modules you have completed, what is still ahead, and how close you are to your certificate.',
  },
  {
    icon: Award,
    title: 'Earn a certificate',
    description:
      'Complete a course and receive a publicly verifiable certificate you can share on LinkedIn or send directly to employers.',
  },
  {
    icon: MessageSquare,
    title: 'Ask questions, get answers',
    description:
      'Course forums keep every discussion organized — post a question, get a reply from a mentor or peer, and keep moving.',
  },
  {
    icon: ClipboardCheck,
    title: 'Get mentor feedback',
    description:
      'Submit your project and receive a structured code review from an experienced mentor — the kind of feedback that actually improves your work.',
  },
  {
    icon: Bell,
    title: 'Stay in the loop',
    description:
      'Instructor announcements, assignment deadlines, and grade notifications land directly in your inbox so you never miss anything.',
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="border-t border-[#e8ecf1] bg-white px-4 py-8 sm:px-6 sm:py-8 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        {/* Heading block — centered */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">
            What you get
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Everything you need to go from zero to hired.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#64748b]">
            Projects, mentorship, certificates, and community — all in one place,
            built around how real developers actually learn.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#e8ecf1] bg-white p-4 transition-colors duration-200 hover:border-blue-200 sm:p-5"
            >
              {/* Icon container */}
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'rgba(59,130,246,0.08)' }}
              >
                <Icon className="size-5 text-[#3b82f6]" aria-hidden="true" />
              </div>

              {/* Text */}
              <h3 className="mt-3 text-sm font-semibold leading-snug text-ink-900">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-[#64748b]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
