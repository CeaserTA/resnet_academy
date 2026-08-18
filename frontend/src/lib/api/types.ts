export type UserRole = 'admin' | 'instructor' | 'student';
export type UserStatus = 'active' | 'suspended' | 'deactivated';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type EnrolmentStatus = 'confirmed' | 'withdrawn';
export type EnrolmentSource = 'self' | 'admin_bulk';
export type EnrolmentPolicy = 'open' | 'advisory' | 'application';
export type CourseApplicationStatus = 'pending' | 'approved' | 'rejected';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'pending' | 'partial' | 'paid';
export type PaymentSubmissionStatus = 'pending' | 'confirmed' | 'rejected';

export interface User {
    id: number;
    role: UserRole;
    name: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    bio: string | null;
    country: string | null;
    city: string | null;
    highest_qualification: string | null;
    occupation: string | null;
    linkedin_profile: string | null;
    portfolio_website: string | null;
    postal_code: string | null;
    tax_id: string | null;
    status: UserStatus;
    email_verified_at: string | null;
    last_login_at: string | null;
    created_at: string;
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    courses_count?: number;
    created_at: string;
}

export interface Course {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    level: CourseLevel;
    enrolment_policy: EnrolmentPolicy;
    advisory_require_attestation: boolean;
    application_questions: string[] | null;
    application_allow_alternative_proof: boolean;
    application_require_portfolio_url: boolean;
    sections_required: boolean;
    thumbnail_url: string | null;
    prerequisites_text: string | null;
    price: string;
    currency: string;
    status: CourseStatus;
    current_version: number;
    confirmation_delay_hours: number;
    schedule_start_date: string | null;
    category: Category | null;
    instructors: User[];
    created_at: string;
    updated_at: string;
}

export interface PaymentSubmission {
    id: number;
    order_id: number;
    amount: string;
    receipt_url: string;
    receipt_original_name: string | null;
    status: PaymentSubmissionStatus;
    reviewed_at: string | null;
    created_at: string;
}

export interface Order {
    id: number;
    course_id: number;
    student: User | null;
    course: { id: number; title: string } | null;
    amount: string;
    amount_paid: string;
    remaining_balance: number;
    currency: string;
    status: OrderStatus;
    payment_method: string | null;
    provider_ref: string | null;
    paid_at: string | null;
    created_at: string;
    pending_submission: PaymentSubmission | null;
    payment_submissions: PaymentSubmission[];
}

export interface Enrolment {
    id: number;
    status: EnrolmentStatus;
    source: EnrolmentSource;
    course: Course;
    applied_at: string;
    confirmation_email_due_at: string;
    confirmation_email_sent_at: string | null;
    order: Order | null;
}

export interface CourseApplication {
    id: number;
    status: CourseApplicationStatus;
    student: User;
    course: Course;
    section: {
        id: number;
        name: string;
        status: string;
    } | null;
    answers: string[] | null;
    portfolio_url: string | null;
    alternative_proof_text: string | null;
    rejection_reason: string | null;
    dismissed_at: string | null;
    recommended_courses: Course[];
    reviewer: { id: number; name: string; role: UserRole } | null;
    applied_at: string;
    reviewed_at: string | null;
}

export interface CourseReview {
    id: number;
    rating: number;
    review_text: string | null;
    status: ReviewStatus;
    admin_notes: string | null;
    is_featured: boolean;
    student: { id: number; name: string } | null;
    course: Course | null;
    reviewer: { id: number; name: string } | null;
    created_at: string;
    reviewed_at: string | null;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
}

export interface ApiErrorBody {
    error: {
        code: string;
        message: string;
        fields: Record<string, string[]> | null;
        missing_fields?: string[];
    };
}

export type ResourceType =
    'video' | 'document' | 'reading' | 'external_link' | 'scorm' | 'live_session' | 'downloadable_file';
export type ModuleProgressStatus = 'locked' | 'not_started' | 'in_progress' | 'completed';

export interface ResourceDetails {
    // video
    bunny_stream_video_id?: string | null;
    duration_seconds?: number | null;
    caption_url?: string | null;
    // document / downloadable_file
    file_url?: string | null;
    file_type?: 'pdf' | 'pptx' | 'docx' | null;
    file_size_kb?: number | null;
    // reading
    content_html?: string | null;
    // external_link
    url?: string | null;
    // scorm
    package_url?: string | null;
    standard?: 'scorm_1_2' | 'scorm_2004' | 'xapi' | null;
    // live_session
    provider?: 'zoom' | 'google_meet' | null;
    meeting_url?: string | null;
    scheduled_at?: string | null;
    duration_minutes?: number | null;
}

export interface ResourceItem {
    id: number;
    module_id: number;
    type: ResourceType;
    title: string;
    description: string | null;
    is_required: boolean;
    order_index: number;
    is_complete: boolean | null;
    details: ResourceDetails;
}

export interface Module {
    id: number;
    course_id: number;
    title: string;
    description: string | null;
    order_index: number;
    scheduled_start_at: string | null;
    group_ids: number[] | null;
    items: ModuleItem[];
    status: ModuleProgressStatus | null;
    deleted_at: string | null;
}

export interface Group {
    id: number;
    course_id: number;
    name: string;
    description: string | null;
    members: User[];
    created_at: string;
}

export interface ModuleProgressEntry {
    module_id: number;
    module_title: string;
    order_index: number;
    status: ModuleProgressStatus;
    unlocked_at: string | null;
    completed_at: string | null;
}

// --- Assessment (Phase 3) ---------------------------------------------------------------

export type AssignmentSubmissionType = 'file' | 'text' | 'both';
export type SubmissionStatus = 'submitted' | 'graded';
export type QuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'short_answer' | 'essay';
export type EvaluationAttemptStatus = 'in_progress' | 'submitted' | 'graded';

/**
 * The three module_items types share no table (ModuleItem deliberately has no morphTo(),
 * see the backend model's docblock) — the frontend discriminates on item_type the same way.
 */
export interface ResourceModuleItem extends ResourceItem {
    item_type: 'resource';
}

export interface AssignmentModuleItem {
    item_type: 'assignment';
    id: number;
    title: string;
    due_at: string | null;
    submission_type: AssignmentSubmissionType;
    max_score: string;
    allow_late: boolean;
    is_required: boolean;
    order_index: number;
    is_complete: boolean | null;
    my_submission: {
        status: SubmissionStatus;
        is_late: boolean;
        final_score: string | null;
        submitted_at: string;
    } | null;
}

export interface EvaluationModuleItem {
    item_type: 'evaluation';
    id: number;
    title: string;
    description: string | null;
    pass_score: string;
    max_attempts: number | null;
    time_limit_minutes: number | null;
    is_required: boolean;
    order_index: number;
    is_complete: boolean | null;
    attempts_used: number | null;
    my_best_attempt: { score_percent: string; passed: boolean } | null;
}

export type ModuleItem = ResourceModuleItem | AssignmentModuleItem | EvaluationModuleItem;

export interface AssignmentRubric {
    id: number;
    criterion: string;
    max_points: string;
}

export interface AssignmentRubricScore {
    id: number;
    rubric_id: number;
    score: string;
    comment: string | null;
}

export interface AssignmentSubmission {
    id: number;
    assignment_id: number;
    student: User | null;
    attempt_number: number;
    file_url: string | null;
    text_content: string | null;
    submitted_at: string;
    is_late: boolean;
    late_penalty_percent: string;
    status: SubmissionStatus;
    raw_score: string | null;
    final_score: string | null;
    feedback: string | null;
    graded_at: string | null;
    rubric_scores: AssignmentRubricScore[];
}

export interface Assignment {
    id: number;
    title: string;
    instructions: string | null;
    submission_type: AssignmentSubmissionType;
    due_at: string | null;
    allow_late: boolean;
    late_penalty_policy_id: number | null;
    max_score: string;
    plagiarism_check_enabled: boolean;
    rubrics: AssignmentRubric[];
}

export interface QuestionOption {
    id: number;
    option_text: string;
    is_correct?: boolean;
    order_index: number;
}

export interface Question {
    id: number;
    type: QuestionType;
    question_text: string;
    points: string;
    auto_gradable: boolean;
    options: QuestionOption[];
}

export interface QuestionBank {
    id: number;
    course_id: number;
    title: string;
    questions: Question[];
}

export interface Evaluation {
    id: number;
    module_id: number;
    course_id: number;
    title: string;
    description: string | null;
    instructions: string | null;
    pass_score: string;
    max_attempts: number | null;
    time_limit_minutes: number | null;
    randomize_questions: boolean;
    questions_per_attempt: number | null;
    available_from: string | null;
    available_until: string | null;
    question_count?: number;
    questions?: Question[];
}

/** The student-facing question shape mid-attempt — never carries an answer key. */
export interface AttemptQuestion {
    id: number;
    type: QuestionType;
    question_text: string;
    points: string;
    options: { id: number; option_text: string }[];
}

export interface EvaluationAttemptAnswer {
    id: number;
    question_id: number;
    selected_option_ids: number[] | null;
    answer_text: string | null;
    is_correct: boolean | null;
    points_awarded: string | null;
}

export interface EvaluationAttempt {
    id: number;
    evaluation_id: number;
    student: User | null;
    attempt_number: number;
    started_at: string;
    submitted_at: string | null;
    score_percent: string | null;
    passed: boolean | null;
    status: EvaluationAttemptStatus;
    answers: EvaluationAttemptAnswer[];
}

export interface StartAttemptResponse {
    attempt: EvaluationAttempt;
    questions: AttemptQuestion[];
    evaluation: { id: number; title: string; pass_score: string; time_limit_minutes: number | null };
}

/** Student-facing pre-start summary — metadata only, never questions or the answer key. */
export interface EvaluationOverview {
    id: number;
    title: string;
    description: string | null;
    instructions: string | null;
    pass_score: string;
    time_limit_minutes: number | null;
    max_attempts: number | null;
    question_count: number;
    total_points: number;
    attempts_used: number;
    attempts_remaining: number | null;
    in_progress_attempt: { id: number; started_at: string } | null;
}

/** Read-only post-attempt breakdown — includes the answer key, served only for completed attempts. */
export interface AttemptReviewOption {
    id: number;
    option_text: string;
    is_correct: boolean;
    selected: boolean;
}

export interface AttemptReviewQuestion {
    question_id: number;
    type: QuestionType;
    question_text: string;
    points: string;
    points_awarded: string | null;
    is_correct: boolean | null;
    selected_option_ids: number[];
    answer_text: string | null;
    options: AttemptReviewOption[];
}

export interface AttemptReview {
    attempt_id: number;
    evaluation_id: number;
    attempt_number: number;
    status: EvaluationAttemptStatus;
    summary: {
        total_score: number;
        max_score: number;
        score_percent: string | null;
        passed: boolean | null;
        started_at: string;
        submitted_at: string | null;
        time_taken_seconds: number | null;
    };
    questions: AttemptReviewQuestion[];
}

export interface GradebookAssignmentColumn {
    id: number;
    title: string;
    max_score: number;
}

export interface GradebookEvaluationColumn {
    id: number;
    title: string;
}

export interface GradebookRow {
    student: { id: number; name: string; email: string };
    assignment_scores: { assignment_id: number; title: string; max_score: number; final_score: number | null }[];
    evaluation_scores: {
        evaluation_id: number;
        title: string;
        best_score_percent: number | null;
        passed: boolean;
    }[];
    final_grade_percent: number | null;
}

export interface Gradebook {
    assignments: GradebookAssignmentColumn[];
    evaluations: GradebookEvaluationColumn[];
    students: GradebookRow[];
}

// --- Progress dashboard, certificates & attendance (Phase 4) ----------------------------

export type CourseProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface CertificateSummary {
    certificate_number: string;
    certificate_url: string | null;
}

export interface ProgressDashboardRow {
    course: { id: number; title: string };
    status: CourseProgressStatus;
    percent_complete: number;
    modules: ModuleProgressEntry[];
    certificate: CertificateSummary | null;
}

export interface Certificate {
    id: number;
    certificate_number: string;
    certificate_url: string | null;
    issued_at: string;
    course: { id: number; title: string };
    student: User | null;
}

export interface CertificateVerification {
    valid: boolean;
    certificate_number: string;
    student_name: string;
    course_title: string;
    issued_at: string;
}

export interface AttendanceRosterEntry {
    student: { id: number; name: string; email: string };
    attended: boolean;
    marked_at: string | null;
}

// --- Communication (Phase 5) -------------------------------------------------------------

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ForumPostReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface Message {
    id: number;
    conversation_id: number;
    sender: User | null;
    body: string;
    sent_at: string;
    read_at: string | null;
}

export interface Conversation {
    id: number;
    subject: string | null;
    participants: User[];
    unread_count?: number;
    last_message: Message | null;
    messages: Message[];
}

export interface TicketMessage {
    id: number;
    ticket_id: number;
    sender: User | null;
    body: string;
    created_at: string;
}

export interface Ticket {
    id: number;
    student: User | null;
    course: { id: number; title: string } | null;
    assigned_to: User | null;
    subject: string;
    status: TicketStatus;
    created_at: string;
    resolved_at: string | null;
    messages: TicketMessage[];
}

export type ForumPostAttachmentType = 'image' | 'video' | 'audio' | 'article';

export interface ForumPost {
    id: number;
    thread_id: number;
    user: User | null;
    body: string;
    attachment_type: ForumPostAttachmentType | null;
    attachment_url: string | null;
    attachment_original_name: string | null;
    edited: boolean;
    created_at: string;
    updated_at: string;
}

export interface ForumTag {
    id: number;
    name: string;
    slug: string;
}

export type ForumSort = 'latest_activity' | 'newest' | 'most_replies';

export interface ForumThread {
    id: number;
    forum_id: number;
    title: string;
    creator: User | null;
    is_pinned: boolean;
    is_locked: boolean;
    solved: boolean;
    created_at: string;
    last_activity_at: string | null;
    reply_count?: number;
    post: ForumPost;
    latest_participant?: User | null;
    tags?: ForumTag[];
    unread?: boolean;
}

export interface ForumPostReport {
    id: number;
    post: ForumPost;
    reporter: User | null;
    reason: string;
    status: ForumPostReportStatus;
    created_at: string;
}

export interface Announcement {
    id: number;
    course_id: number;
    posted_by: User | null;
    title: string;
    body: string;
    created_at: string;
}

export interface AppNotification {
    id: number;
    type: string;
    title: string;
    body: string | null;
    related_entity_type: string | null;
    related_entity_id: number | null;
    is_read: boolean;
    sent_at: string | null;
}

export interface NotificationListResponse {
    data: AppNotification[];
    meta: { current_page: number; last_page: number; unread_count: number };
}

// --- Analytics & Audit (Phase 6) ---------------------------------------------------------

export interface AtRiskStudent {
    student: { id: number; name: string; email: string };
    enrolled_at: string;
    last_engaged_at: string | null;
    final_grade_percent: number | null;
    risk_factor: string;
}

export interface RosterEntry {
    student: { id: number; name: string; email: string };
    enrolled_at: string;
    percent_complete: number;
    status: 'active' | 'graduated';
}

export interface CourseAnalytics {
    total_students: number;
    completed_students: number;
    completion_rate: number;
    at_risk_students: AtRiskStudent[];
    engagement_summary: Record<string, number>;
    roster: RosterEntry[];
}

export interface AuditLogEntry {
    id: number;
    actor: User | null;
    action: string;
    entity_type: string;
    entity_id: number;
    meta: Record<string, unknown> | null;
    created_at: string;
}

export interface CurrencyTotal {
    currency: string;
    total: number;
}

export interface DashboardSummary {
    students: number;
    instructors: number;
    courses_by_status: Record<string, number>;
    confirmed_enrolments: number;
    certificates_issued: number;
    revenue_by_currency: CurrencyTotal[];
    open_tickets: number;
    pending_reviews: number;
    at_risk_students: number;
    recent_audit_logs: AuditLogEntry[];
}
