import { StarRating } from '@/components/ui/StarRating';
import { useFeaturedReviews } from '@/features/reviews/useReviews';

const AVATAR_STYLES = [
  { bg: 'bg-[#eff6ff]', text: 'text-blue-700' },
  { bg: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700' },
];

function initialsFor(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function Testimonials() {
  const { data: reviews } = useFeaturedReviews();

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section id="testimonials" className="border-t border-[#e8ecf1] bg-[#fafbfc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Left-aligned heading block */}
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
            Student stories
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            What our students are achieving.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#64748b]">
            Real outcomes from learners who came in with ambition and left with
            portfolios, jobs, and the confidence to keep building.
          </p>
        </div>

        {/* 3-column grid */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review, index) => {
            const name = review.student?.name ?? 'Resnet student';
            const style = AVATAR_STYLES[index % AVATAR_STYLES.length];

            return (
              <div
                key={review.id}
                className="rounded-2xl border border-[#e8ecf1] bg-white p-6 transition-colors duration-200 hover:border-blue-200"
              >
                {/* Avatar + name row */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${style.bg} ${style.text}`}
                  >
                    {initialsFor(name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{name}</p>
                    {review.course && <p className="text-xs text-[#94a3b8]">{review.course.title}</p>}
                  </div>
                </div>

                <div className="mt-3">
                  <StarRating value={review.rating} readOnly size="sm" />
                </div>

                {review.review_text && (
                  <blockquote className="mt-3 text-sm leading-7 text-[#64748b]">"{review.review_text}"</blockquote>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
