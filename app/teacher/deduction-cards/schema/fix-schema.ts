"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function fixDeductionCardsSchema() {
  try {
    // Use admin client for database schema operations
    const supabase = await createAdminClient();
    
    // Direct SQL approach using the service role key
    const { error } = await supabase.rpc("pg_direct_sql", { 
      query: `
        -- Check if created_by column already exists and add it if it doesn't
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' AND column_name = 'created_by'
          ) THEN
            ALTER TABLE public.deduction_cards ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
          END IF;
          
          -- Check if assigned_to column already exists and add it if it doesn't
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' AND column_name = 'assigned_to'
          ) THEN
            ALTER TABLE public.deduction_cards ADD COLUMN assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;
          END IF;
          
          -- Check if constraint already exists and drop it if needed
          IF EXISTS (
            SELECT FROM pg_constraint WHERE conname = 'deduction_cards_assigned_to_fkey'
          ) THEN
            ALTER TABLE public.deduction_cards DROP CONSTRAINT deduction_cards_assigned_to_fkey;
          END IF;
          
          -- Create the assigned_to constraint if column exists
          IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' AND column_name = 'assigned_to'
          ) THEN
            ALTER TABLE public.deduction_cards
            ADD CONSTRAINT deduction_cards_assigned_to_fkey
            FOREIGN KEY (assigned_to) REFERENCES public.users(id)
            ON DELETE SET NULL;
          END IF;
          
          -- Create the created_by constraint if column exists
          IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deduction_cards' AND column_name = 'created_by'
          ) THEN
            ALTER TABLE public.deduction_cards
            ADD CONSTRAINT deduction_cards_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.users(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      `
    });
    
    if (error) {
      console.error("Direct SQL method failed:", error);
      
      // Try falling back to a more common RPC name for Supabase
      const { error: fallbackError } = await supabase.rpc("execute_sql", { 
        sql: `
          -- Add required columns
          ALTER TABLE public.deduction_cards ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
          ALTER TABLE public.deduction_cards ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;
        `
      });
      
      if (fallbackError) {
        console.error("Fallback SQL method failed:", fallbackError);
        throw fallbackError;
      }
    }

    // Brief pause to allow schema to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { 
      success: true,
      message: "تم إضافة الأعمدة المطلوبة وإصلاح العلاقات بين الجداول. الرجاء تحديث الصفحة للتحقق من النتيجة."
    };
  } catch (error: any) {
    console.error("Error fixing schema:", error);
    return { 
      success: false, 
      message: "تعذّر إصلاح العلاقة بين الجداول. الرجاء التواصل مع مسؤول النظام."
    };
  }
} 