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
import { cn } from '@/lib/utils';

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const numericString = (message: string) =>
    z.string().min(1, message).refine((v) => !Number.isNaN(Number(v)), 'Enter a number');

const schema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    category_id: z.string().optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    enrolment_policy: z.enum(['open', 'advisory', 'application']),
    advisory_require_attestation: z.boolean().optional(),
    application_questions: z.array(z.object({ text: z.string().min(1, "Question can't be empty") })).optional(),
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

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm', className)}>
            <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
            </div>
            <div className="space-y-4 bg-blue-50/20 p-4">{children}</div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CourseFormPage() {
    const { id } = useParams();
    const isEditing = !!id;
    const courseId = Number(id);
    const navigate = useNavigate();

    const { data: course, isLoading: isLoadingCourse } = useCourse(courseId);
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
                application_allow_alternative_proof: true,
                application_require_portfolio_url: false,
                currency: 'UGX',
                confirmation_delay_hours: '24',
                instructor_ids: [],
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
                application_questions: (course.application_questions ?? []).map((text) => ({ text })),
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
            application_questions: values.application_questions?.map((q) => q.text) ?? [],
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
        <div className="mx-auto max-w-6xl">

            {/* Page header */}
            <div className="mb-4">
                <h1 className="text-lg font-semibold text-ink-900">
                    {isEditing ? 'Edit course' : 'New course'}
                </h1>
                <p className="text-xs text-ink-400">
                    {isEditing ? 'Update the course details below.' : 'Fill in the details to create a new course.'}
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {formError && <Alert variant="error" message={formError} />}
                {Object.keys(errors).length > 0 && (
                    <Alert
                        variant="error"
                        message={`Fix the following: ${Object.entries(errors).map(([f, e]) => `${f} (${e?.message ?? 'invalid'})`).join(', ')}`}
                    />
                )}

                {/* Two-column layout */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                    {/* LEFT — main fields (2/3) */}
                    <div className="space-y-4 lg:col-span-2">

                        {/* Basic info */}
                        <Section title="Basic information">
                            <Input label="Title" error={errors.title?.message} {...register('title')} />

                            <div className="grid grid-cols-2 gap-3">
                                <Select label="Level" {...register('level')}>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </Select>

                                <div className="space-y-2">
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <Select label="Category" {...register('category_id')}>
                                                <option value="">No category</option>
                                                {categories?.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </Select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingCategory((v) => !v)}
                                            aria-label="Add category"
                                            className="flex items-center justify-center rounded-lg p-2 text-ink-400 transition hover:bg-surface-100 hover:text-ink-900"
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

                            <Textarea label="Description" rows={3} {...register('description')} />
                            <Textarea label="Prerequisites (informational only)" rows={2} {...register('prerequisites_text')} />
                        </Section>

                        {/* Thumbnail */}
                        <Section title="Course thumbnail">
                            {thumbnailError && <Alert variant="error" message={thumbnailError} />}
                            <div className="flex items-center gap-4">
                                <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-100 text-ink-300">
                                    {thumbnailPreview || course?.thumbnail_url ? (
                                        <img
                                            src={thumbnailPreview ?? course?.thumbnail_url ?? undefined}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <ImagePlus className="size-6" aria-hidden="true" />
                                    )}
                                </div>
                                <div>
                                    <input
                                        ref={thumbnailInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={handleThumbnailChange}
                                    />
                                    <Button type="button" size="sm" variant="secondary" onClick={() => thumbnailInputRef.current?.click()}>
                                        <ImagePlus className="size-3.5" aria-hidden="true" />
                                        {thumbnailFile ? 'Change image' : 'Upload image'}
                                    </Button>
                                    <p className="mt-1 text-xs text-ink-400">JPEG, PNG or WEBP · max 5 MB</p>
                                </div>
                            </div>
                        </Section>

                        {/* Pricing */}
                        <Section title="Pricing">
                            <div className="grid grid-cols-3 gap-3">
                                <Input label="Price" type="number" step="0.01" error={errors.price?.message} {...register('price')} />
                                <Input label="Currency" maxLength={3} {...register('currency')} />
                                <Input label="Confirmation delay (hours)" type="number" error={errors.confirmation_delay_hours?.message} {...register('confirmation_delay_hours')} />
                            </div>
                        </Section>

                        {/* Enrolment strategy */}
                        <Section title="Enrolment strategy">
                            <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-ink-400">
                                    Defaults from level — Beginner: Open, Intermediate: Advisory, Advanced: Application.
                                </p>
                                <label className="flex shrink-0 items-center gap-2 text-xs text-ink-900">
                                    <input
                                        type="checkbox"
                                        checked={overridePolicy}
                                        onChange={(e) => setOverridePolicy(e.target.checked)}
                                    />
                                    Override
                                </label>
                            </div>

                            <Select label="Enrolment policy" disabled={!overridePolicy} {...register('enrolment_policy')}>
                                <option value="open">Open — instant self-enrol</option>
                                <option value="advisory">Advisory — prerequisites, then self-enrol</option>
                                <option value="application">Application — admin reviews and approves</option>
                            </Select>

                            {enrolmentPolicy === 'advisory' && (
                                <label className="flex items-center gap-2 text-sm text-ink-900">
                                    <input type="checkbox" {...register('advisory_require_attestation')} />
                                    Require students to confirm they meet prerequisites before enrolling
                                </label>
                            )}

                            {enrolmentPolicy === 'application' && (
                                <div className="space-y-3">
                                    <div>
                                        <p className="mb-2 text-sm font-medium text-ink-900">Application questions</p>
                                        <div className="space-y-2">
                                            {questionFields.map((field, index) => (
                                                <div key={field.id} className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <Input
                                                            label={`Question ${index + 1}`}
                                                            labelClassName="sr-only"
                                                            placeholder={`Question ${index + 1}`}
                                                            error={errors.application_questions?.[index]?.text?.message}
                                                            {...register(`application_questions.${index}.text` as const)}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(index)}
                                                        aria-label={`Remove question ${index + 1}`}
                                                        className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition hover:bg-danger-600/10 hover:text-danger-600"
                                                    >
                                                        <Trash2 className="size-4" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => appendQuestion({ text: '' })}>
                                            <Plus className="size-3.5" aria-hidden="true" />
                                            Add question
                                        </Button>
                                    </div>

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

                        {/* Status + change log — edit only */}
                        {isEditing && (
                            <Section title="Publishing">
                                <div className="grid grid-cols-2 gap-3">
                                    <Select label="Status" {...register('status')}>
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </Select>
                                    <Textarea label="What changed? (notifies enrolled students)" rows={2} {...register('change_summary')} />
                                </div>
                            </Section>
                        )}
                    </div>

                    {/* RIGHT — instructors (1/3) */}
                    <div className="lg:self-start overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
                            <h2 className="text-sm font-semibold text-ink-900">Instructors</h2>
                            <p className="text-xs text-ink-400">Assign one or more instructors to this course.</p>
                        </div>
                        <div className="bg-blue-50/20 p-4">
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
                                            <p className="text-xs text-ink-400">No instructors yet.</p>
                                        )}
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3">
                    <Button type="submit" isLoading={isSubmitting}>
                        {isEditing ? 'Save changes' : 'Create course'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => navigate('/admin/courses')}>
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}
