import { Quote } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';

interface Testimonial {
    name: string;
    role: string;
    quote: string;
}

// Illustrative placeholder quotes — there's no reviews/ratings table backing this yet, so these
// are generic and grounded in what the product actually does, not claimed as verified reviews.
const TESTIMONIALS: Testimonial[] = [
    {
        name: 'Amara K.',
        role: 'Web Development student',
        quote: 'I could fit modules around my work schedule instead of the other way around. Picking up exactly where I left off made it easy to stay consistent.',
    },
    {
        name: 'Daniel O.',
        role: 'Data Analysis student',
        quote: 'Having an instructor actually respond in the course forum made a real difference — it never felt like I was just watching videos alone.',
    },
    {
        name: 'Priya S.',
        role: 'UX Design student',
        quote: 'The structured modules kept me on track, and getting a certificate at the end made the whole thing feel worth finishing.',
    },
];

export function TestimonialsSection() {
    return (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl">What students say</h2>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                {TESTIMONIALS.map((testimonial) => (
                    <Card key={testimonial.name} className="flex flex-col gap-4">
                        <Quote className="size-6 text-blue-400" aria-hidden="true" />
                        <p className="text-sm text-ink-900">{testimonial.quote}</p>
                        <div className="mt-auto flex items-center gap-3">
                            <Avatar name={testimonial.name} />
                            <div>
                                <p className="text-sm font-medium text-ink-900">{testimonial.name}</p>
                                <p className="text-xs text-ink-600">{testimonial.role}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </section>
    );
}
