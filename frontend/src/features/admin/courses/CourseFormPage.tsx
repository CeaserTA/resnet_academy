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
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const numericString = (message: string) =>
    z
        .string()
        .min(1, message)
        .refine((value) => !Number.isNaN(Number(value)), 'Enter a number');

const schema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    category_id: z.string().optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    enrolment_policy: z.enum(['open', 'advisory', 'application']),
    advisory_require_attestation: z.boolean().optional(),
    application_questions: z.array(z.object({ text: z.string().min(1, 'Question can’t be empty') })).optional(),
    application_allow_alternative_proof: z.boolean().optional(),
    application_require_portfolio_url: z.boolean().optional(),
    description: z.string().optional(),
    price: numericString('Price is required').refine((value) => Number(value) >= 0, 'Price can’t be negative'),
    currency: z.string().length(3, 'Use a 3-letter currency code'),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    prerequisites_text: z.string().optional(),
    confirmation_delay_hours: numericString('Required').refine((value) => Number(value) >= 0, 'Can’t be negative'),
    instructor_ids: z.array(z.number()).optional(),
    change_summary: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_POLICY_BY_LEVEL: Record<FormValues['level'], EnrolmentPolicy> = {
    beginner: 'open',
    intermediate: 'advisory',
    advanced: 'application',
};

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
        if (!newCategoryName.trim()) {
            setCategoryError('Name is required');
            return;
        }

        try {
            await createCategoryMutation.mutateAsync({ name: newCategoryName.trim() });
        } catch (error) {
            setCategoryError(error instanceof ApiError ? error.message : 'Could not create the category.');
        }
    };

    const [overridePolicy, setOverridePolicy] = useState(false);

    const {
        register,
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
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
        if (!overridePolicy) {
            setValue('enrolment_policy', DEFAULT_POLICY_BY_LEVEL[level]);
        }
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
        if (!selected) {
            return;
        }

        setThumbnailError(null);

        if (selected.size > MAX_THUMBNAIL_BYTES) {
            setThumbnailError('That image is over 5MB. Choose a smaller one.');
            return;
        }

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
            if (isEditing) {
                await updateCourse.mutateAsync(payload);
            } else {
                await createCourse.mutateAsync(payload);
            }
            navigate('/admin/courses');
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : 'Could not save the course. Try again.');
        }
    };

    if (isEditing && isLoadingCourse) {
        return <Spinner />;
    }

    return (
        <div className="max-w-6xl">
            <h1 className="text-2xl">{isEditing ? 'Edit course' : 'New course'}</h1>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {formError && <Alert variant="error" message={formError} className="mt-4" />}
                {Object.keys(errors).length > 0 && (
                    <Alert
                        variant="error"
                        message={`Fix the following before saving: ${Object.entries(errors)
                            .map(([field, error]) => `${field} (${error?.message ?? 'invalid'})`)
                            .join(', ')}`}
                        className="mt-4"
                    />
                )}

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card className="flex flex-col gap-4 lg:col-span-2">
                        <Input label="Title" error={errors.title?.message} {...register('title')} />

                        <div>
                            <p className="text-sm font-medium text-ink-900">Thumbnail</p>
                            {thumbnailError && <Alert variant="error" message={thumbnailError} className="mt-2" />}
                            <div className="mt-2 flex items-center gap-4">
                                <div className="flex aspect-video w-40 shrink-0 items-center justify-center overflow-hidden rounded-md bg-blue-50 text-blue-600">
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
                                <input
                                    ref={thumbnailInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handleThumbnailChange}
                                />
                                <Button type="button" variant="secondary" onClick={() => thumbnailInputRef.current?.click()}>
                                    <ImagePlus className="size-4" aria-hidden="true" />
                                    {thumbnailFile ? 'Change image' : 'Upload image'}
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Select label="Level" {...register('level')}>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </Select>

                            <div>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <Select label="Category" {...register('category_id')}>
                                            <option value="">No category</option>
                                            {categories?.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="px-2 py-2"
                                        onClick={() => setIsAddingCategory((value) => !value)}
                                        aria-label="Add a new category"
                                    >
                                        <Plus className="size-4" aria-hidden="true" />
                                    </Button>
                                </div>

                                {isAddingCategory && (
                                    <div className="mt-2 flex items-end gap-2">
                                        <div className="flex-1">
                                            <Input
                                                label="New category name"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                error={categoryError ?? undefined}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={handleAddCategory}
                                            isLoading={createCategoryMutation.isPending}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-md border border-surface-100 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-ink-900">Enrollment strategy</p>
                                    <p className="text-sm text-ink-600">
                                        Defaults from the course level — Beginner is Open, Intermediate is Advisory,
                                        Advanced is Application.
                                    </p>
                                </div>
                                <label className="flex shrink-0 items-center gap-2 text-sm text-ink-900">
                                    <input
                                        type="checkbox"
                                        checked={overridePolicy}
                                        onChange={(e) => setOverridePolicy(e.target.checked)}
                                    />
                                    Override default policy
                                </label>
                            </div>

                            <div className="mt-3">
                                <Select label="Enrollment policy" disabled={!overridePolicy} {...register('enrolment_policy')}>
                                    <option value="open">Open — instant self-enrol</option>
                                    <option value="advisory">Advisory — prerequisites, then self-enrol</option>
                                    <option value="application">Application — admin reviews and approves</option>
                                </Select>
                            </div>

                            {enrolmentPolicy === 'advisory' && (
                                <label className="mt-3 flex items-center gap-2 text-sm text-ink-900">
                                    <input type="checkbox" {...register('advisory_require_attestation')} />
                                    Require students to confirm they meet the prerequisites before enrolling
                                </label>
                            )}

                            {enrolmentPolicy === 'application' && (
                                <div className="mt-3 flex flex-col gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-ink-900">Application questions</p>
                                        <div className="mt-2 flex flex-col gap-2">
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
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="px-2 py-2"
                                                        onClick={() => removeQuestion(index)}
                                                        aria-label={`Remove question ${index + 1}`}
                                                    >
                                                        <Trash2 className="size-4" aria-hidden="true" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="mt-2"
                                            onClick={() => appendQuestion({ text: '' })}
                                        >
                                            <Plus className="size-4" aria-hidden="true" />
                                            Add question
                                        </Button>
                                    </div>

                                    <label className="flex items-center gap-2 text-sm text-ink-900">
                                        <input type="checkbox" {...register('application_require_portfolio_url')} />
                                        Require a portfolio/link URL
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-ink-900">
                                        <input type="checkbox" {...register('application_allow_alternative_proof')} />
                                        Allow alternative proof of skill (side projects, personal statement)
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Input
                                label="Price"
                                type="number"
                                step="0.01"
                                error={errors.price?.message}
                                {...register('price')}
                            />
                            <Input label="Currency" maxLength={3} {...register('currency')} />
                            <Input
                                label="Confirmation delay (hours)"
                                type="number"
                                error={errors.confirmation_delay_hours?.message}
                                {...register('confirmation_delay_hours')}
                            />
                        </div>

                        <Textarea label="Description" rows={4} {...register('description')} />
                        <Textarea
                            label="Prerequisites (informational only, not enforced)"
                            rows={2}
                            {...register('prerequisites_text')}
                        />

                        {isEditing && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Select label="Status" {...register('status')}>
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </Select>
                                <Textarea
                                    label="What changed? (notifies enrolled students)"
                                    rows={2}
                                    {...register('change_summary')}
                                />
                            </div>
                        )}
                    </Card>

                    <Card className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-ink-900">Instructors</p>
                        <Controller
                            control={control}
                            name="instructor_ids"
                            render={({ field }) => (
                                <div className="flex flex-col gap-2">
                                    {instructors?.map((instructor) => (
                                        <label
                                            key={instructor.id}
                                            className="flex items-center gap-2 text-sm text-ink-900"
                                        >
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
                                            />
                                            {instructor.name}
                                        </label>
                                    ))}
                                    {instructors?.length === 0 && (
                                        <p className="text-sm text-ink-600">No instructors yet.</p>
                                    )}
                                </div>
                            )}
                        />
                    </Card>
                </div>

                <Button type="submit" isLoading={isSubmitting} className="mt-6">
                    {isEditing ? 'Save changes' : 'Create course'}
                </Button>
            </form>
        </div>
    );
}
