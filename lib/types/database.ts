export interface Database {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          id: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          id?: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      
      attendance_records: {
        Row: {
          class_id: number
          created_at: string | null
          date: string
          id: number
          recorded_by: string
          status_id: number
          student_id: string
          updated_at: string | null
        }
        Insert: {
          class_id: number
          created_at?: string | null
          date: string
          id?: number
          recorded_by: string
          status_id: number
          student_id: string
          updated_at?: string | null
        }
        Update: {
          class_id?: number
          created_at?: string | null
          date?: string
          id?: number
          recorded_by?: string
          status_id?: number
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      
      negative_points: {
        Row: {
          id: string
          user_id: string
          points: number
          reason: string
          status: string
          created_at: string
          paid_at: string | null
          category_id: string | null
          is_optional: boolean | null
          auto_processed: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          points: number
          reason: string
          status?: string
          created_at?: string
          paid_at?: string | null
          category_id?: string | null
          is_optional?: boolean | null
          auto_processed?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          reason?: string
          status?: string
          created_at?: string
          paid_at?: string | null
          category_id?: string | null
          is_optional?: boolean | null
          auto_processed?: boolean | null
        }
        Relationships: []
      }
      
      point_categories: {
        Row: {
          id: string
          name: string
          is_mandatory: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_mandatory?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_mandatory?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      
      point_transactions: {
        Row: {
          id: string
          user_id: string
          points: number
          reason: string
          transaction_type: string
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points: number
          reason: string
          transaction_type: string
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          reason?: string
          transaction_type?: string
          reference_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      
      student_points: {
        Row: {
          id: string
          student_id: string
          points: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          points: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          points?: number
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      
      user_records: {
        Row: {
          id: number
          record_code: string
          user_id: string
          title: string
          category: string
          description: string | null
          points_value: number
          valid_from: string
          valid_until: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: number
          record_code?: string
          user_id: string
          title: string
          category: string
          description?: string | null
          points_value: number
          valid_from: string
          valid_until?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          record_code?: string
          user_id?: string
          title?: string
          category?: string
          description?: string | null
          points_value?: number
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_records_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_records_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    
    Views: {
      available_rewards_by_role: {
        Row: {
          id: string
          name: string
          description: string | null
          points_cost: number
          active: boolean
          image_url: string | null
          stock: number | null
          created_at: string | null
          updated_at: string | null
          role: string | null
        }
        Relationships: []
      }
      messages_old: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          subject: string
          content: string
          read: boolean
          created_at: string
          sender_name: string
          recipient_name: string
        }
        Relationships: []
      }
      messages_view: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          subject: string
          content: string
          read: boolean
          created_at: string
          sender_name: string
          recipient_name: string
        }
        Relationships: []
      }
      reward_redemptions_view: {
        Row: {
          id: string
          user_id: string
          reward_id: string
          points: number
          status: string
          created_at: string
          user_name: string
          reward_name: string
        }
        Relationships: []
      }
      user_messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          subject: string
          content: string
          read: boolean
          created_at: string
          sender_name: string
          recipient_name: string
          user_id: string
          is_sender: boolean
        }
        Relationships: []
      }
    }
    
    Functions: {}
    
    Enums: {}
  }
} 