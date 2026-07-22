import { apiClient } from '@/lib/api/client';

export async function importEnrolmentsCsv(courseId: number, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('course_id', String(courseId));
    formData.append('file', file);

    await apiClient.post('/enrolments/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
}
