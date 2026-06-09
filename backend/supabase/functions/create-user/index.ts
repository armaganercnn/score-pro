import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Create a Supabase client with the service role key to bypass RLS and use Admin API
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

    // Check if the caller is an admin (Security: maybeSingle prevents exception if user is not in admins table)
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
        JSON.stringify({ error: 'Yetkisiz işlem: Sadece adminler kullanıcı oluşturabilir.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const body = await req.json()
    const { email, password, name } = body

    // Validation
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'E-posta ve şifre zorunludur.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz e-posta adresi formatı.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Password length check
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Şifre en az 6 karakter olmalıdır.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Use the admin api to create the user without signing the admin out
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Beklenmeyen sunucu hatası.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
