// Role IDs
export const ROLES = {
  STUDENT: 1,
  PARENT: 2,
  TEACHER: 3,
  ADMIN: 4,
}

// Role names in Arabic
export const ROLE_NAMES = {
  [ROLES.STUDENT]: "طالب",
  [ROLES.PARENT]: "ولي أمر",
  [ROLES.TEACHER]: "معلم",
  [ROLES.ADMIN]: "مدير النظام",
}

// Routes by role
export const ROLE_HOME_ROUTES = {
  [ROLES.STUDENT]: "/student",
  [ROLES.PARENT]: "/parent",
  [ROLES.TEACHER]: "/teacher",
  [ROLES.ADMIN]: "/admin",
}

// Point categories
export const POINT_TYPES = {
  POSITIVE: true,
  NEGATIVE: false,
}

// Table names for consistency
export const TABLES = {
  USERS: "users",
  POINTS_TRANSACTIONS: "points_transactions",
  POINT_CATEGORIES: "point_categories",
  REWARDS: "rewards",
  USER_REWARDS: "user_rewards",
  BADGES: "badges",
  USER_BADGES: "user_badges",
  NOTIFICATIONS: "notifications",
  CONVERSATIONS: "conversations",
  USER_MESSAGES: "user_messages",
  USER_RECORDS: "user_records",
}

// Status codes
export const STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
}

// Default pagination values
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
}

// Date formats
export const DATE_FORMATS = {
  STANDARD: "YYYY-MM-DD",
  DISPLAY: "DD/MM/YYYY",
  DATETIME: "YYYY-MM-DD HH:mm:ss",
} 