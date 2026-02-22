export interface Term {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  enrollment_start: string | null
  enrollment_end: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type UserRole = 'student' | 'admin' | 'instructor' | 'tutor'

export interface Profile {
  id: string
  email: string
  role: UserRole
  display_name: string
  avatar_url: string | null
  student_number: string | null
  grade: number | null
  phone: string | null
  parent_name: string | null
  parent_phone: string | null
  created_at: string
  updated_at: string
}

export interface CourseCategory {
  id: string
  name: string
  slug: string
  display_order: number
  description: string | null
  created_at: string
}

export interface Course {
  id: string
  category_id: string
  name: string
  subject: string
  description: string
  instructor_name: string | null
  instructor_id: string | null
  course_type: 'group' | 'individual_1on1' | 'individual_1on2' | 'individual_1on3'
  day_of_week: string | null
  start_time: string | null
  end_time: string | null
  classroom: string | null
  capacity: number
  price: number
  target_grade: string | null
  term: string | null
  term_id: string | null
  status: 'draft' | 'open' | 'closed'
  display_order: number
  created_at: string
  updated_at: string
  // Relations
  category?: CourseCategory
  enrollments?: Enrollment[]
  term_info?: Term
}

export interface TimetableSlot {
  id: string
  course_id: string
  day_of_week: string
  period: number
  start_time: string
  end_time: string
  classroom: string
  term: string
  created_at: string
  // Relations
  course?: Course
}

export type PaymentMethod = 'bank_transfer' | 'installment_1' | 'installment_2'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'
export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  term_id: string | null
  status: EnrollmentStatus
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  payment_amount: number
  payment_due_date: string | null
  enrolled_at: string
  confirmed_at: string | null
  created_at: string
  updated_at: string
  // Relations
  student?: Profile
  course?: Course
  term_info?: Term
}

export interface ClassroomAssignment {
  id: string
  course_id: string
  classroom: string
  day_of_week: string
  start_time: string
  end_time: string
  effective_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  course?: Course
}

export interface InstructorNote {
  id: string
  instructor_id: string
  course_id: string
  target_audience: 'student' | 'tutor' | 'both'
  title: string
  content: string
  created_at: string
  updated_at: string
  // Relations
  instructor?: Profile
  course?: Course
}

export type PrintRequestStatus = 'pending' | 'printing' | 'completed'

export interface PrintRequest {
  id: string
  instructor_id: string
  course_id: string | null
  title: string
  description: string | null
  file_url: string
  file_name: string
  copies: number
  status: PrintRequestStatus
  requested_by_date: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
  // Relations
  instructor?: Profile
  course?: Course
}

export interface TuitionInfo {
  id: string
  category_id: string | null
  course_type: string
  label: string
  price: number
  unit: string
  notes: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface FrontContent {
  id: string
  section: string
  title: string | null
  content: string | null
  image_url: string | null
  display_order: number
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  category: string
  subject: string
  message: string
  status: 'unread' | 'read' | 'replied'
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  target_audience: 'all' | 'student' | 'instructor' | 'tutor'
  is_published: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface StudentUsageNote {
  id: string
  title: string
  content: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
