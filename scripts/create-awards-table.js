// Script to create the awards tables and policies

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAwardsTable() {
  console.log('Creating awards table...');
  
  try {
    // Create awards table using raw SQL via REST
    const { error: createError } = await supabase.from('_externalauth').select('*', { count: 'exact', head: true }).executeRaw(`
      DO $$
      BEGIN
        -- Create awards table
        CREATE TABLE IF NOT EXISTS public.awards (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          image_url TEXT,
          points_required INTEGER NOT NULL DEFAULT 100,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Setup RLS
        ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        -- View policy
        DROP POLICY IF EXISTS "Awards are viewable by everyone" ON public.awards;
        CREATE POLICY "Awards are viewable by everyone" 
          ON public.awards FOR SELECT 
          USING (true);
        
        -- Insert policy
        DROP POLICY IF EXISTS "Only admins can insert awards" ON public.awards;
        CREATE POLICY "Only admins can insert awards" 
          ON public.awards FOR INSERT 
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.users
              WHERE users.id = auth.uid()
              AND users.role_id = 1
            )
          );
        
        -- Update policy
        DROP POLICY IF EXISTS "Only admins can update awards" ON public.awards;
        CREATE POLICY "Only admins can update awards" 
          ON public.awards FOR UPDATE 
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.users
              WHERE users.id = auth.uid()
              AND users.role_id = 1
            )
          );
        
        -- Delete policy
        DROP POLICY IF EXISTS "Only admins can delete awards" ON public.awards;
        CREATE POLICY "Only admins can delete awards" 
          ON public.awards FOR DELETE 
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.users
              WHERE users.id = auth.uid()
              AND users.role_id = 1
            )
          );
        
        -- Create user_awards table
        CREATE TABLE IF NOT EXISTS public.user_awards (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          award_id INTEGER REFERENCES public.awards(id) ON DELETE CASCADE,
          awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          awarded_by UUID REFERENCES auth.users(id),
          UNIQUE(user_id, award_id)
        );
        
        -- Setup RLS for user_awards
        ALTER TABLE public.user_awards ENABLE ROW LEVEL SECURITY;
        
        -- Create policies for user_awards
        -- View policy
        DROP POLICY IF EXISTS "Users can view their own awards and admins can view all" ON public.user_awards;
        CREATE POLICY "Users can view their own awards and admins can view all" 
          ON public.user_awards FOR SELECT 
          TO authenticated
          USING (
            user_id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM public.users
              WHERE users.id = auth.uid()
              AND users.role_id = 1
            )
          );
        
        -- Insert policy
        DROP POLICY IF EXISTS "Only admins can award badges" ON public.user_awards;
        CREATE POLICY "Only admins can award badges" 
          ON public.user_awards FOR INSERT 
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.users
              WHERE users.id = auth.uid()
              AND users.role_id = 1
            )
          );
        
        -- Delete policy
        DROP POLICY IF EXISTS "Only admins can remove user awards" ON public.user_awards;
        CREATE POLICY "Only admins can remove user awards" 
          ON public.user_awards FOR DELETE 
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.users
              WHERE users.id = auth.uid()
              AND users.role_id = 1
            )
          );
          
      END $$;
    `);
    
    if (createError) {
      console.error('Error creating awards table and related objects:', createError);
      return;
    }
    
    console.log('Awards tables and policies created successfully');
    
    // Try to add a test award to make sure everything works
    const { data: testAward, error: testError } = await supabase
      .from('awards')
      .insert({
        name: 'وسام الاختبار',
        description: 'هذا وسام اختباري تم إنشاؤه تلقائيًا',
        image_url: null,
        points_required: 100
      })
      .select()
      .single();
      
    if (testError) {
      console.error('Error inserting test award:', testError);
    } else {
      console.log('Test award inserted successfully:', testAward);
    }
    
    console.log('Setup completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
createAwardsTable(); 