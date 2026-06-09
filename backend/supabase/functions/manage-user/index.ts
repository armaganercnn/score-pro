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
      return new Response(
        JSON.stringify({ error: 'Yetkisiz işlem: Authorization başlığı eksik.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Yetkisiz işlem: Geçersiz token.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if the caller is an admin
    const { data: adminData, error: adminError } = await supabaseClient
      .from('admins')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle()

    if (adminError) {
      return new Response(
        JSON.stringify({ error: `Sunucu hatası: Admin kontrolü yapılamadı (${adminError.message})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!adminData) {
      return new Response(
        JSON.stringify({ error: 'Yetkisiz işlem: Sadece adminler bu işlemi yapabilir.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const body = await req.json()
    const { action, userId } = body

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Kullanıcı ID (userId) zorunludur.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      return new Response(
        JSON.stringify({ success: true, message: 'Kullanıcı başarıyla silindi.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } 
    
    if (action === 'update') {
      const { email, password, name } = body
      const updates: any = {}
      
      if (email) {
        // Email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return new Response(
            JSON.stringify({ error: 'Geçersiz e-posta adresi formatı.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        updates.email = email
      }

      if (password) {
        // Password length check
        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: 'Şifre en az 6 karakter olmalıdır.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        updates.password = password
      }

      if (name) {
        updates.user_metadata = { full_name: name }
      }

      if (Object.keys(updates).length === 0) {
         return new Response(
            JSON.stringify({ error: 'Güncellenecek hiçbir bilgi girilmedi.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
         )
      }

      const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updates
      )

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Geçersiz işlem (action).' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Beklenmeyen sunucu hatası.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
