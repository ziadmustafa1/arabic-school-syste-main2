export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      student_points: {
        Row: {
          id: number
          student_id: string
          points: number
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: number
          student_id: string
          points: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          student_id?: string
          points?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_points_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      points_transactions: {
        Row: {
          id: number
          user_id: string
          points: number
          is_positive: boolean
          description?: string
          created_at?: string
          created_by?: string
          category_id?: number
        }
        Insert: {
          id?: number
          user_id: string
          points: number
          is_positive: boolean
          description?: string
          created_at?: string
          created_by?: string
          category_id?: number
        }
        Update: {
          id?: number
          user_id?: string
          points?: number
          is_positive?: boolean
          description?: string
          created_at?: string
          created_by?: string
          category_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: number
          user_id: string
          title: string
          message: string
          is_read: boolean
          created_at?: string
        }
        Insert: {
          id?: number
          user_id: string
          title: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          message?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          full_name?: string
          role_id?: number
          created_at?: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          role_id?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role_id?: number
          created_at?: string
        }
        Relationships: []
      }
    }
  }
}
