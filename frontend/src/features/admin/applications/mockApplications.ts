export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface Application {
    id: number;
    studentName: string;
    studentEmail: string;
    courseTitle: string;
    appliedAt: string;
    status: ApplicationStatus;
}

/**
 * Placeholder data — there's no `pending`/`approved`/`rejected` application state anywhere in
 * the schema (enrolments auto-confirm by design, per FR-2/FR-3). This is a preview of what an
 * approval workflow could look like, not a live feed; see the note on `ApplicationsPage`.
 */
export const MOCK_APPLICATIONS: Application[] = [
    {
        id: 1,
        studentName: 'Amara Kintu',
        studentEmail: 'amara.kintu@example.com',
        courseTitle: 'Introduction to Web Development',
        appliedAt: '2026-07-18T09:12:00Z',
        status: 'pending',
    },
    {
        id: 2,
        studentName: 'Daniel Okello',
        studentEmail: 'daniel.okello@example.com',
        courseTitle: 'Data Analysis with Python',
        appliedAt: '2026-07-19T14:40:00Z',
        status: 'pending',
    },
    {
        id: 3,
        studentName: 'Priya Shah',
        studentEmail: 'priya.shah@example.com',
        courseTitle: 'UX Design Fundamentals',
        appliedAt: '2026-07-15T11:05:00Z',
        status: 'approved',
    },
    {
        id: 4,
        studentName: 'Brian Mugisha',
        studentEmail: 'brian.mugisha@example.com',
        courseTitle: 'Introduction to Web Development',
        appliedAt: '2026-07-14T08:30:00Z',
        status: 'approved',
    },
    {
        id: 5,
        studentName: 'Grace Nabirye',
        studentEmail: 'grace.nabirye@example.com',
        courseTitle: 'Data Analysis with Python',
        appliedAt: '2026-07-20T16:55:00Z',
        status: 'pending',
    },
    {
        id: 6,
        studentName: 'Kevin Ssemwogerere',
        studentEmail: 'kevin.ssemwogerere@example.com',
        courseTitle: 'UX Design Fundamentals',
        appliedAt: '2026-07-16T10:20:00Z',
        status: 'rejected',
    },
    {
        id: 7,
        studentName: 'Faith Atim',
        studentEmail: 'faith.atim@example.com',
        courseTitle: 'Introduction to Web Development',
        appliedAt: '2026-07-17T13:00:00Z',
        status: 'rejected',
    },
];
