import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Plus, Trash2 } from 'lucide-react';
import { useCategories } from '@/features/catalogue/useCourses';
import { createCategory, deleteCategory } from '@/features/admin/categories/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';

const schema = z.object({
    name: z.string().min(1, 'Name is required').max(120),
});

type FormValues = z.infer<typeof schema>;

export function CategoryListPage() {
    const { data: categories, isLoading } = useCategories();
    const queryClient = useQueryClient();
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const createMutation = useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            reset();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    });

    const onSubmit = async (values: FormValues) => {
        setFormError(null);
        try {
            await createMutation.mutateAsync(values);
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : 'Could not create the category.');
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl">Categories</h1>

            <Card className="mt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-3" noValidate>
                    <div className="flex-1">
                        <Input label="New category name" error={errors.name?.message} {...register('name')} />
                    </div>
                    <Button type="submit" isLoading={isSubmitting}>
                        <Plus className="size-4" aria-hidden="true" />
                        Add
                    </Button>
                </form>
                {formError && <Alert variant="error" message={formError} className="mt-3" />}
            </Card>

            <div className="mt-6">
                {isLoading && <Spinner />}

                {!isLoading && categories?.length === 0 && (
                    <EmptyState
                        icon={FolderTree}
                        title="No categories yet"
                        description="Add one above to start organizing courses."
                    />
                )}

                {!isLoading && categories && categories.length > 0 && (
                    <ul className="divide-y divide-surface-100 rounded-lg border border-surface-100 bg-surface-0">
                        {categories.map((category) => (
                            <li key={category.id} className="flex items-center justify-between px-4 py-3">
                                <span className="text-ink-900">{category.name}</span>
                                <Button
                                    variant="ghost"
                                    className="px-2 py-1"
                                    onClick={() => deleteMutation.mutate(category.id)}
                                    aria-label={`Delete ${category.name}`}
                                >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
