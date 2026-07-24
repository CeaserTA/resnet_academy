import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus } from 'lucide-react';
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

    const {
        register,
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { level: 'beginner', currency: 'UGX', confirmation_delay_hours: '24', instructor_ids: [] },
    });

    useEffect(() => {
        if (course) {
            reset({
                title: course.title,
                category_id: course.category?.id.toString(),
                level: course.level,
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
