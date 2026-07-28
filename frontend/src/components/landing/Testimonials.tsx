// TODO: Replace placeholder testimonials with real student quotes
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const testimonials = [
  {
    initials: 'AM',
    name: 'Amina Mukasa',
    role: 'Frontend Development Graduate',
    quote:
      'I built my first responsive website in just six weeks, and now I feel confident enough to start applying for frontend roles in Kampala.',
  },
  {
    initials: 'BJ',
    name: 'Brian Juma',
    role: 'Backend Development Graduate',
    quote:
      'The backend track helped me understand Laravel, build APIs, and present a real project during interviews. It was the boost I needed to earn my first contract.',
  },
  {
    initials: 'CN',
    name: 'Catherine Nanyonga',
    role: 'Specialized Skills Participant',
    quote:
      'Learning SEO, analytics, and database optimization in one course gave me practical skills I could use immediately on client work and freelance projects.',
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="border-t border-[#e8ecf1] bg-[#fafbfc] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Student stories</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Real confidence from real projects.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#64748b] sm:text-lg">
            These placeholder testimonials show how learners move from first projects to jobs, stronger digital skills, and new opportunities.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map(({ initials, name, role, quote }) => (
            <Card
              key={name}
              className="rounded-3xl border border-[#e8ecf1] bg-white p-0 px-6 py-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <CardHeader className="flex items-start gap-4 p-0 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-semibold">
                  {initials}
                </div>
                <div>
                  <CardTitle className="text-base">{name}</CardTitle>
                  <p className="text-sm text-[#64748b]">{role}</p>
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <p className="text-base leading-7 text-[#334155]">{quote}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
