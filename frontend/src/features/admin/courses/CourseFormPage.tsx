import { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import type { EnrolmentPolicy } from '@/lib/api/types';
import { useCategories, useCourse } from '@/features/catalogue/useCourses';
import { useUsers } from '@/features/admin/users/useAdminUsers';
import { useCreateCourse, useUpdateCourse } from '@/features/admin/courses/useAdminCourses';
import { createCategory } from '@/features/admin/categories/api';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const numericString = (message: string) =>
    z.string().min(1, message).refine((v) => !Number.isNaN(Number(v)), 'Enter a number');

const schema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    category_id: z.string().optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    enrolment_policy: z.enum(['open', 'advisory', 'application']),
    advisory_require_attestation: z.boolean().optional(),
    application_questions: z.array(z.object({
        text: z.string().min(1, "Question can't be empty"),
        correct_answer: z.boolean(),
    })).optional(),
    application_pass_threshold: z.string().optional(),
    application_allow_alternative_proof: z.boolean().optional(),
    application_require_portfolio_url: z.boolean().optional(),
    description: z.string().optional(),
    price: numericString('Price is required').refine((v) => Number(v) >= 0, "Price can't be negative"),
    currency: z.string().length(3, 'Use a 3-letter currency code'),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    prerequisites_text: z.string().optional(),
    confirmation_delay_hours: numericString('Required').refine((v) => Number(v) >= 0, "Can't be negative"),
    instructor_ids: z.array(z.number()).optional(),
    change_summary: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_POLICY_BY_LEVEL: Record<FormValues['level'], EnrolmentPolicy> = {
    beginner: 'open',
    intermediate: 'advisory',
    advanced: 'application',
};

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm', className)}>
            <div className="border-b border-surface-100 bg-surface-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
                {description && <p className="text-xs text-ink-600">{description}</p>}
            </div>
            <div className="space-y-4 p-5">{children}</div>
        </section>
    );
}

const POLICY_LABEL: Record<EnrolmentPolicy, string> = {
    open: 'Open',
    advisory: 'Advisory',
    application: 'Application',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CourseFormPage() {
    const { id } = useParams();
    const isEditing = !!id;
    const courseId = Number(id);
    const navigate = useNavigate();
    const { user } = useAuth();

    const { data: course, isLoading: isLoadingCourse } = useCourse(courseId);
    usePageHeader(
        isEditing ? 'Edit course' : 'New course',
        isEditing ? course?.title ?? 'Update the course details' : 'Fill in the details to create a course',
    );
    const { data: categories } = useCategories();
    const { data: instructors } = useUsers('instructor');
    const createCourse = useCreateCourse();
    const updateCourse = useUpdateCourse(courseId);
    const [formError, setFormError] = useState<string | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [thumbnailError, setThumbnailError] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    const queryClient = useQueryClient();
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryError, setCategoryError] = useState<string | null>(null);
    const createCategoryMutation = useMutation({
        mutationFn: createCategory,
        onSuccess: (category) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setValue('category_id', category.id.toString());
            setNewCategoryName('');
            setIsAddingCategory(false);
        },
    });

    const handleAddCategory = async () => {
        setCategoryError(null);
        if (!newCategoryName.trim()) { setCategoryError('Name is required'); return; }
        try {
            await createCategoryMutation.mutateAsync({ name: newCategoryName.trim() });
        } catch (error) {
            setCategoryError(error instanceof ApiError ? error.message : 'Could not create the category.');
        }
    };

    const [overridePolicy, setOverridePolicy] = useState(false);

    const { register, control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
        useForm<FormValues>({
            resolver: zodResolver(schema),
            defaultValues: {
                level: 'beginner',
                enrolment_policy: 'open',
                advisory_require_attestation: false,
                application_questions: [],
                application_pass_threshold: '100',
                application_allow_alternative_proof: true,
                application_require_portfolio_url: false,
                currency: 'UGX',
                confirmation_delay_hours: '24',
                // An instructor creating a course teaches it — pre-tick them so it shows up under
                // their courses (they can still add co-instructors).
                instructor_ids: user?.role === 'instructor' ? [user.id] : [],
            },
        });

    const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
        control,
        name: 'application_questions',
    });

    const level = watch('level');
    const enrolmentPolicy = watch('enrolment_policy');

    useEffect(() => {
        if (!overridePolicy) setValue('enrolment_policy', DEFAULT_POLICY_BY_LEVEL[level]);
    }, [level, overridePolicy, setValue]);

    useEffect(() => {
        if (course) {
            setOverridePolicy(course.enrolment_policy !== DEFAULT_POLICY_BY_LEVEL[course.level]);
            reset({
                title: course.title,
                category_id: course.category?.id.toString(),
                level: course.level,
                enrolment_policy: course.enrolment_policy,
                advisory_require_attestation: course.advisory_require_attestation,
                application_questions: (course.application_questions ?? []).map((q) => ({
                    text: q.text,
                    correct_answer: q.correct_answer ?? true,
                })),
                application_pass_threshold: course.application_pass_threshold != null
                    ? String(course.application_pass_threshold)
                    : '100',
                application_allow_alternative_proof: course.application_allow_alternative_proof,
                application_require_portfolio_url: course.application_require_portfolio_url,
                description: course.description ?? '',
                price: course.price,
                currency: course.currency,
                status: course.status,
                prerequisites_text: course.prerequisites_text ?? '',
                confirmation_delay_hours: String(course.confirmation_delay_hours),
                instructor_ids: course.instructors.map((i) => i.id),
            });
        }
    }, [course, reset]);

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        e.target.value = '';
        if (!selected) return;
        setThumbnailError(null);
        if (selected.size > MAX_THUMBNAIL_BYTES) { setThumbnailError('That image is over 5 MB. Choose a smaller one.'); return; }
        setThumbnailFile(selected);
        setThumbnailPreview(URL.createObjectURL(selected));
    };

    const onSubmit = async (values: FormValues) => {
        setFormError(null);
        const payload = {
            ...values,
            price: Number(values.price),
            confirmation_delay_hours: Number(values.confirmation_delay_hours),
            category_id: values.category_id ? Number(values.category_id) : undefined,
            application_pass_threshold: values.enrolment_policy === 'application' && values.application_pass_threshold
                ? Number(values.application_pass_threshold)
                : undefined,
            thumbnail: thumbnailFile ?? undefined,
        };
        try {
            if (isEditing) { await updateCourse.mutateAsync(payload); }
            else { await createCourse.mutateAsync(payload); }
            navigate('/admin/courses');
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : 'Could not save the course. Try again.');
        }
    };

    if (isEditing && isLoadingCourse) return <Spinner />;

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Action bar — pinned to the top of the page while you scroll, so Save is always in reach.
                The negative margins let it span the page's padding so content never shows behind it. */}
            <div className="sticky -top-4 z-20 -mx-4 -mt-4 sm:-top-5 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 bg-surface-50/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:-mt-5 sm:px-5">
                <Breadcrumbs
                    items={[
                        { label: user?.role === 'admin' ? 'Courses' : 'My courses', to: '/admin/courses' },
                        ...(isEditing && course ? [{ label: course.title, to: `/admin/courses/${course.id}/modules` }] : []),
                        { label: isEditing ? 'Edit details' : 'New course' },
                    ]}
                />
                <div className="ml-auto flex items-center gap-2">
                    <Button type="button" variant="ghost" onClick={() => navigate('/admin/courses')}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        {isEditing ? 'Save changes' : 'Create course'}
                    </Button>
                </div>
            </div>

                {formError && <Alert variant="error" message={formError} />}
                {Object.keys(errors).length > 0 && (
                    <Alert
                        variant="error"
                        message={`Fix the following: ${Object.entries(errors).map(([f, e]) => `${f} (${e?.message ?? 'invalid'})`).join(', ')}`}
                    />
                )}

                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
                    {/* ── Main form (2/3) ── */}
                    <div className="space-y-5 lg:col-span-2">
                        <Section title="Course image" description="Shown on the course card in the catalogue and at the top of the course page.">
                            {thumbnailError && <Alert variant="error" message={thumbnailError} />}
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-surface-100 bg-surface-50 text-ink-300 sm:w-64">
                                    {thumbnailPreview || course?.thumbnail_url ? (
                                        <img src={thumbnailPreview ?? course?.thumbnail_url ?? undefined} alt="" className="size-full object-cover" />
                                    ) : (
                                        <ImagePlus className="size-8" aria-hidden="true" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <input
                                        ref={thumbnailInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={handleThumbnailChange}
                                    />
                                    <Button type="button" size="sm" variant="secondary" onClick={() => thumbnailInputRef.current?.click()}>
                                        <ImagePlus className="size-3.5" aria-hidden="true" />
                                        {thumbnailPreview || course?.thumbnail_url ? 'Change image' : 'Upload image'}
                                    </Button>
                                    <p className="text-xs text-ink-600">JPEG, PNG or WEBP, up to 5 MB.</p>
                                    <p className="text-xs text-ink-600">A wide 16:9 image works best, e.g. 1280 × 720.</p>
                                    {thumbnailFile && <p className="text-xs font-medium text-ink-900">New image selected — it's saved with the course.</p>}
                                </div>
                            </div>
                        </Section>

                        <Section title="Basic information" description="What students see in the catalogue.">
                            <Input label="Title" error={errors.title?.message} {...register('title')} />

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Controller
                                    control={control}
                                    name="level"
                                    // Controller, not register(): the Radix select only shows a value it is given as a
                                    // prop. Empty selections come from Radix itself (never a user pick), so ignore them.
                                    render={({ field }) => (
                                        <Select
                                            label="Level"
                                            name={field.name}
                                            value={field.value ?? ''}
                                            onChange={(e) => e.target.value && field.onChange(e.target.value)}
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </Select>
                                    )}
                                />

                                <div className="space-y-2">
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <Controller
                                                control={control}
                                                name="category_id"
                                                render={({ field }) => (
                                                    <Select
                                                        label="Category"
                                                        name={field.name}
                                                        value={field.value || 'none'}
                                                        onChange={(e) => e.target.value && field.onChange(e.target.value === 'none' ? '' : e.target.value)}
                                                    >
                                                        <option value="none">No category</option>
                                                        {categories?.map((cat) => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingCategory((v) => !v)}
                                            aria-label="Add category"
                                            className="flex items-center justify-center rounded-lg p-2 text-ink-600 transition hover:bg-surface-100 hover:text-ink-900"
                                        >
                                            <Plus className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                    {isAddingCategory && (
                                        <div className="flex items-end gap-2">
                                            <div className="flex-1">
                                                <Input
                                                    label="New category name"
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    error={categoryError ?? undefined}
                                                />
                                            </div>
                                            <Button type="button" size="sm" onClick={handleAddCategory} isLoading={createCategoryMutation.isPending}>
                                                Add
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Textarea label="Description" rows={4} placeholder="What the course covers and who it's for" {...register('description')} />
                            <div>
                                <Textarea label="Prerequisites (optional)" rows={2} {...register('prerequisites_text')} />
                                <p className="mt-1 text-xs text-ink-600">Shown to students for information only — it doesn't block enrolment.</p>
                            </div>
                        </Section>

                        <Section title="Pricing" description="What students pay. Set the price to 0 for a free course.">
                            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                                <Input label="Price" type="number" step="0.01" error={errors.price?.message} {...register('price')} />
                                <Input label="Currency" maxLength={3} error={errors.currency?.message} {...register('currency')} />
                            </div>
                        </Section>

                        <Section title="Enrolment" description="How students join this course.">
                            <div>
                                <Input label="Confirmation delay (hours)" type="number" error={errors.confirmation_delay_hours?.message} {...register('confirmation_delay_hours')} />
                                <p className="mt-1 text-xs text-ink-600">How long after enrolling a student receives their confirmation email.</p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2.5">
                                <p className="text-sm text-ink-900">
                                    {overridePolicy ? 'Custom policy' : <>Follows the level default: <span className="font-semibold">{POLICY_LABEL[DEFAULT_POLICY_BY_LEVEL[level]]}</span></>}
                                    <span className="block text-xs text-ink-600">Beginner → Open · Intermediate → Advisory · Advanced → Application</span>
                                </p>
                                <label className="flex shrink-0 items-center gap-2 text-sm text-ink-900">
                                    <input
                                        type="checkbox"
                                        checked={overridePolicy}
                                        onChange={(e) => setOverridePolicy(e.target.checked)}
                                        aria-label="Override default policy"
                                    />
                                    Override
                                </label>
                            </div>

                            <Controller
                                control={control}
                                name="enrolment_policy"
                                render={({ field }) => (
                                    <Select
                                        label="Enrolment policy"
                                        disabled={!overridePolicy}
                                        name={field.name}
                                        value={field.value ?? ''}
                                        onChange={(e) => e.target.value && field.onChange(e.target.value)}
                                    >
                                        <option value="open">Open — instant self-enrol</option>
                                        <option value="advisory">Advisory — prerequisites, then self-enrol</option>
                                        <option value="application">Application — admin reviews and approves</option>
                                    </Select>
                                )}
                            />

                            {enrolmentPolicy === 'advisory' && (
                                <label className="flex items-center gap-2 text-sm text-ink-900">
                                    <input type="checkbox" {...register('advisory_require_attestation')} />
                                    Require students to confirm they meet prerequisites before enrolling
                                </label>
                            )}

                            {enrolmentPolicy === 'application' && (
                                <div className="space-y-3">
                                    <div>
                                        <p className="mb-1 text-sm font-medium text-ink-900">Eligibility questions</p>
                                        <p className="mb-2 text-xs text-ink-600">
                                            Yes/No questions the system grades automatically. An applicant who meets
                                            the pass threshold below is enrolled immediately — no review needed.
                                        </p>
                                        <div className="space-y-2">
                                            {questionFields.map((field, index) => (
                                                <div key={field.id} className="flex items-start gap-2 rounded-lg border border-surface-100 bg-surface-0 p-2">
                                                    <div className="flex-1 space-y-1.5">
                                                        <Input
                                                            label={`Question ${index + 1}`}
                                                            labelClassName="sr-only"
                                                            placeholder={`Question ${index + 1}`}
                                                            error={errors.application_questions?.[index]?.text?.message}
                                                            {...register(`application_questions.${index}.text` as const)}
                                                        />
                                                        <Controller
                                                            control={control}
                                                            name={`application_questions.${index}.correct_answer` as const}
                                                            render={({ field: correctAnswerField }) => (
                                                                <div className="flex items-center gap-2 text-xs text-ink-600">
                                                                    <span>Correct answer:</span>
                                                                    {([true, false] as const).map((option) => (
                                                                        <button
                                                                            key={String(option)}
                                                                            type="button"
                                                                            onClick={() => correctAnswerField.onChange(option)}
                                                                            className={cn(
                                                                                'rounded-md border px-2.5 py-1 font-medium transition-colors',
                                                                                correctAnswerField.value === option
                                                                                    ? 'border-blue-600 bg-blue-600 text-white'
                                                                                    : 'border-surface-100 bg-surface-0 text-ink-900 hover:border-blue-400',
                                                                            )}
                                                                        >
                                                                            {option ? 'Yes' : 'No'}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(index)}
                                                        aria-label={`Remove question ${index + 1}`}
                                                        className="flex items-center justify-center rounded-lg p-1.5 text-ink-600 transition hover:bg-danger-600/10 hover:text-danger-600"
                                                    >
                                                        <Trash2 className="size-4" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => appendQuestion({ text: '', correct_answer: true })}>
                                            <Plus className="size-3.5" aria-hidden="true" />
                                            Add question
                                        </Button>
                                    </div>

                                    {questionFields.length > 0 && (
                                        <Input
                                            label="Auto-approve pass threshold (%)"
                                            type="number"
                                            min={1}
                                            max={100}
                                            error={errors.application_pass_threshold?.message}
                                            {...register('application_pass_threshold')}
                                        />
                                    )}

                                    <label className="flex items-center gap-2 text-sm text-ink-900">
                                        <input type="checkbox" {...register('application_require_portfolio_url')} />
                                        Require a portfolio/link URL
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-ink-900">
                                        <input type="checkbox" {...register('application_allow_alternative_proof')} />
                                        Allow alternative proof of skill
                                    </label>
                                </div>
                            )}
                        </Section>
                    </div>

                    {/* ── Side panel (1/3): publishing + instructors ── */}
                    <div className="space-y-5">
                        {isEditing && (
                            <section className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                                <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
                                    <h2 className="text-sm font-semibold text-ink-900">Publishing</h2>
                                    <p className="text-xs text-ink-600">Status, and what students are told about changes.</p>
                                </div>
                                <div className="space-y-4 p-4">
                                    <Controller
                                                control={control}
                                                name="status"
                                                render={({ field }) => (
                                                    <Select
                                                        label="Status"
                                                        name={field.name}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => e.target.value && field.onChange(e.target.value)}
                                                    >
                                                        <option value="draft">Draft</option>
                                                        <option value="published">Published</option>
                                                        <option value="archived">Archived</option>
                                                    </Select>
                                                )}
                                            />
                                            <div>
                                                <Textarea label="What changed? (optional)" rows={3} {...register('change_summary')} />
                                                <p className="mt-1 text-xs text-ink-600">Enrolled students are notified with this message.</p>
                                            </div>
                                </div>
                            </section>
                        )}

                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
                            <h2 className="text-sm font-semibold text-ink-900">Instructors</h2>
                            <p className="text-xs text-ink-600">
                                {user?.role === 'instructor'
                                    ? 'Only an admin can change who teaches a course.'
                                    : 'Assign one or more instructors to this course.'}
                            </p>
                        </div>
                        {/* The instructor list comes from an admin-only endpoint, so instructors see who
                            teaches the course (themselves when creating) rather than an empty picker. */}
                        {user?.role === 'instructor' ? (
                            <ul className="space-y-1.5 p-4 text-sm text-ink-900">
                                {(isEditing ? course?.instructors ?? [] : [user]).map((person) => (
                                    <li key={person.id}>
                                        {person.name}
                                        {person.id === user.id && <span className="text-ink-600"> (you)</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                        <div className="p-4">
                            <Controller
                                control={control}
                                name="instructor_ids"
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        {instructors?.map((instructor) => (
                                            <label key={instructor.id} className="flex items-center gap-2.5 text-sm text-ink-900 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.value?.includes(instructor.id) ?? false}
                                                    onChange={(e) => {
                                                        const current = field.value ?? [];
                                                        field.onChange(
                                                            e.target.checked
                                                                ? [...current, instructor.id]
                                                                : current.filter((i) => i !== instructor.id),
                                                        );
                                                    }}
                                                    className="rounded border-surface-100"
                                                />
                                                {instructor.name}
                                            </label>
                                        ))}
                                        {!instructors?.length && (
                                            <p className="text-xs text-ink-600">No instructors yet.</p>
                                        )}
                                    </div>
                                )}
                            />
                        </div>
                        )}
                    </div>
                    </div>
                </div>
        </form>
    );
}
