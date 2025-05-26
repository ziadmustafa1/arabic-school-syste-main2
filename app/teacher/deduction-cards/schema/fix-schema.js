"use server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Fixes the deduction_cards schema issues
 * The error is related to a missing foreign key relationship between deduction_cards and users tables
 */
export async function fixDeductionCardsSchema() {
  try {
    const supabase = await createAdminClient();

    // First, check if the assigned_to column exists in the deduction_cards table
    const { data: columnExists, error: columnError } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'deduction_cards' 
          AND column_name = 'assigned_to'
        );
      `
    });

    if (columnError) {
      console.error("Error checking for column:", columnError);
      return { success: false, message: "Failed to check schema", error: columnError };
    }

    // If column doesn't exist, add it
    if (!columnExists || !columnExists[0] || !columnExists[0].exists) {
      const { error: addColumnError } = await supabase.rpc("exec_sql", {
        sql: `
          ALTER TABLE public.deduction_cards 
          ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
        `
      });

      if (addColumnError) {
        console.error("Error adding assigned_to column:", addColumnError);
        return { success: false, message: "Failed to add assigned_to column", error: addColumnError };
      }
    }

    // Create or fix the relationship between deduction_cards and users
    const { error: foreignKeyError } = await supabase.rpc("exec_sql", {
      sql: `
        -- First, drop the constraint if it exists but is incorrect
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage 
            WHERE constraint_name = 'deduction_cards_assigned_to_fkey'
          ) THEN
            ALTER TABLE public.deduction_cards DROP CONSTRAINT IF EXISTS deduction_cards_assigned_to_fkey;
          END IF;
        END $$;

        -- Then create the proper foreign key constraint
        ALTER TABLE public.deduction_cards 
        ADD CONSTRAINT deduction_cards_assigned_to_fkey
        FOREIGN KEY (assigned_to) REFERENCES auth.users(id);
      `
    });

    if (foreignKeyError) {
      console.error("Error creating foreign key:", foreignKeyError);
      return { success: false, message: "Failed to create foreign key", error: foreignKeyError };
    }

    // Update any other columns needed for the teacher/deduction-cards page query to work
    const { error: columnsError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Ensure the created_by column exists and has proper reference
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' 
            AND column_name = 'created_by'
          ) THEN
            ALTER TABLE public.deduction_cards ADD COLUMN created_by UUID REFERENCES auth.users(id);
          END IF;
        END $$;

        -- Make sure we have code, points, is_used columns since they are referenced in the app
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' 
            AND column_name = 'code'
          ) THEN
            ALTER TABLE public.deduction_cards ADD COLUMN code TEXT;
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' 
            AND column_name = 'points'
          ) THEN
            ALTER TABLE public.deduction_cards ADD COLUMN points INTEGER DEFAULT 0;
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' 
            AND column_name = 'is_used'
          ) THEN
            ALTER TABLE public.deduction_cards ADD COLUMN is_used BOOLEAN DEFAULT false;
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' 
            AND column_name = 'used_by'
          ) THEN
            ALTER TABLE public.deduction_cards ADD COLUMN used_by UUID REFERENCES auth.users(id);
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' 
            AND column_name = 'used_at'
          ) THEN
            ALTER TABLE public.deduction_cards ADD COLUMN used_at TIMESTAMP WITH TIME ZONE;
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' 
            AND column_name = 'expiry_date'
          ) THEN
            ALTER TABLE public.deduction_cards ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE;
          END IF;
        END $$;
      `
    });

    if (columnsError) {
      console.error("Error updating columns:", columnsError);
      return { success: false, message: "Failed to update columns", error: columnsError };
    }

    return { success: true, message: "Schema fixed successfully" };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, message: "Unexpected error occurred", error };
  }
} 