import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    })

    // Check Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Yetkisiz işlem: Authorization başlığı eksik.')
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !authUser) {
      throw new Error('Yetkisiz işlem: Geçersiz token.')
    }

    // Check if the caller is an admin
    const { data: adminData } = await supabaseClient
      .from('admins')
      .select('id')
      .eq('id', authUser.id)
      .single()

    if (!adminData) {
      throw new Error('Yetkisiz işlem: Sadece adminler bu işlemi yapabilir.')
    }

    const body = await req.json()
    const { action, userId } = body

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Kullanıcı ID (userId) zorunludur.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error
      return new Response(
        JSON.stringify({ success: true, message: 'Kullanıcı başarıyla silindi.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } 
    
    if (action === 'update') {
      const { email, password, name } = body
      const updates: any = {}
      
      if (email) updates.email = email
      if (password) updates.password = password
      if (name) updates.user_metadata = { full_name: name }

      if (Object.keys(updates).length === 0) {
         return new Response(
            JSON.stringify({ error: 'Güncellenecek hiçbir bilgi girilmedi.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
         )
      }

      const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updates
      )

      if (error) throw error
      return new Response(
        JSON.stringify({ success: true, user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Geçersiz işlem (action).' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
