import { useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
    useAddGroupMember,
    useCreateGroup,
    useDeleteGroup,
    useGroups,
    useRemoveGroupMember,
} from '@/features/courseStructure/useCourseStructure';

export function GroupsPanel({ courseId }: { courseId: number }) {
    const { data: groups } = useGroups(courseId);
    const createGroup = useCreateGroup(courseId);
    const deleteGroup = useDeleteGroup(courseId);
    const addMember = useAddGroupMember(courseId);
    const removeMember = useRemoveGroupMember(courseId);

    const [name, setName] = useState('');
    const [memberInputs, setMemberInputs] = useState<Record<number, string>>({});

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await createGroup.mutateAsync({ name });
        setName('');
    };

    const handleAddMember = async (groupId: number) => {
        const studentId = Number(memberInputs[groupId]);
        if (!studentId) return;
        await addMember.mutateAsync({ groupId, studentId });
        setMemberInputs((prev) => ({ ...prev, [groupId]: '' }));
    };

    return (
        <Card>
            <h2 className="text-lg">Groups / cohorts</h2>
            <p className="mt-1 text-sm text-ink-600">
                A module with no group linked applies to every student. Scope a module to specific groups for staggered
                delivery.
            </p>

            <form onSubmit={handleCreateGroup} className="mt-4 flex items-end gap-2">
                <div className="flex-1">
                    <Input label="New group name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <Button type="submit" isLoading={createGroup.isPending}>
                    Add group
                </Button>
            </form>

            <div className="mt-4 flex flex-col gap-3">
                {groups?.length === 0 && <EmptyState icon={Users} title="No groups yet" description="Add one above." />}

                {groups?.map((group) => (
                    <div key={group.id} className="rounded-md border border-surface-100 p-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-ink-900">{group.name}</span>
                            <Button
                                variant="ghost"
                                className="px-2 py-1"
                                onClick={() => deleteGroup.mutate(group.id)}
                                aria-label={`Delete group ${group.name}`}
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                        </div>

                        <ul className="mt-2 flex flex-col gap-1">
                            {group.members.map((member) => (
                                <li key={member.id} className="flex items-center justify-between text-sm text-ink-600">
                                    {member.name} ({member.email})
                                    <button
                                        onClick={() => removeMember.mutate({ groupId: group.id, studentId: member.id })}
                                        className="text-danger-600 hover:underline"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-2 flex items-end gap-2">
                            <div className="flex-1">
                                <Input
                                    label="Student ID"
                                    type="number"
                                    value={memberInputs[group.id] ?? ''}
                                    onChange={(e) =>
                                        setMemberInputs((prev) => ({ ...prev, [group.id]: e.target.value }))
                                    }
                                />
                            </div>
                            <Button variant="secondary" onClick={() => handleAddMember(group.id)}>
                                <UserPlus className="size-4" aria-hidden="true" />
                                Add
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
