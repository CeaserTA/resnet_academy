export enum CourseSectionStatus {
    Draft = 'draft',
    Open = 'open',
    InProgress = 'in_progress',
    Completed = 'completed',
    Closed = 'closed',
}

export interface CourseSection {
    id: number;
    course_id: number;
    name: string;
    start_date: string;
    end_date: string;
    application_deadline?: string;
    capacity: number | null;
    seats_taken: number;
    enrolled_count?: number;
    seats_available?: number | null;
    status: CourseSectionStatus;
    primary_instructor_id?: number;
    primary_instructor?: {
        id: number;
        name: string;
        email: string;
    };
    // Analytics fields — only present for admin/instructor, not for students/guests
    waitlisted_count?: number;
    applications_pending_count?: number;
    is_full: boolean;
    is_accepting_applications: boolean;
    created_at: string;
    updated_at: string;
}

export interface PublicSection extends Omit<CourseSection, 'course_id'> {
    course: {
        id: number;
        title: string;
        slug: string;
        description: string | null;
        level: 'beginner' | 'intermediate' | 'advanced';
        enrolment_policy: 'open' | 'advisory' | 'application';
        thumbnail_url: string | null;
        category: {
            id: number;
            name: string;
        } | null;
        instructors: Array<{
            id: number;
            name: string;
            email: string;
        }>;
    };
}

export interface CreateSectionInput {
    name: string;
    start_date: string;
    end_date: string;
    application_deadline?: string;
    capacity?: number;
    status: CourseSectionStatus;
    primary_instructor_id?: number;
}
