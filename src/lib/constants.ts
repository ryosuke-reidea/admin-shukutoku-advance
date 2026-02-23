export const SUBJECTS = [
  '英語',
  '数学',
  '国語',
  '理科',
  '社会',
] as const

export const DAYS_OF_WEEK = [
  '月', '火', '水', '木', '金', '土',
] as const

export const TIME_SLOTS = [
  { period: 1, start: '16:40', end: '18:00' },
  { period: 2, start: '18:10', end: '19:30' },
  { period: 3, start: '19:40', end: '21:00' },
] as const

export const COURSE_TYPES = {
  group: '集団授業',
  individual_1on1: '個別指導（1対1）',
  individual_1on2: '個別指導（1対2）',
  individual_1on3: '個別指導（1対3）',
} as const

export const PAYMENT_METHODS = {
  bank_transfer: '銀行振込',
  account_transfer_lump: '口座振替（一括）',
  account_transfer_installment: '口座振替（分割）',
} as const

export const PAYMENT_STATUSES = {
  unpaid: '未払い',
  partial: '一部入金',
  paid: '支払い済み',
  refunded: '返金済み',
} as const

export const ENROLLMENT_STATUSES = {
  pending: '申込中',
  confirmed: '確定',
  cancelled: 'キャンセル',
  completed: '完了',
} as const

export const CATEGORY_SLUGS = {
  general: '一般',
  recommendation: '推薦',
  ryugata: '留型クラス',
  junior: '中学',
} as const

export const TARGET_GRADES = [
  '高1', '高2', '高3', '中学',
] as const

export const COMPANY_INFO = {
  name: '株式会社RE-IDEA',
  representative: '中井亮介',
  address: '東京都渋谷区',
  phone: '03-3969-7411',
  email: 'info@shukutokuadvance.com',
  established: '2024年5月',
  capital: '300万円',
} as const
