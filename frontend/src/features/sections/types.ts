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
    capacity?: number;
    seats_taken: number;
    status: CourseSectionStatus;
    primary_instructor_id?: number;
    primary_instructor?: {
        id: number;
        name: string;
        email: string;
    };
    enrolled_count: number;
    waitlisted_count: number;
    applications_pending_count: number;
    is_full: boolean;
    is_accepting_applications: boolean;
    created_at: string;
    updated_at: string;
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
