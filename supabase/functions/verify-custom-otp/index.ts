import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otp } = await req.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const cleanOtp = String(otp || '').trim()

    if (!normalizedEmail || cleanOtp.length !== 4) {
      return new Response(JSON.stringify({ error: 'Invalid email or OTP.' }), { status: 400, headers: corsHeaders })
    }

    const { data: otpRow, error: selectError } = await supabase
      .from('custom_auth_otps')
      .select('id, otp_hash, expires_at, attempts, verified')
      .eq('email', normalizedEmail)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (selectError || !otpRow) {
      return new Response(JSON.stringify({ error: 'OTP not found.' }), { status: 400, headers: corsHeaders })
    }

    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'OTP expired.' }), { status: 400, headers: corsHeaders })
    }

    if (Number(otpRow.attempts || 0) >= 5) {
      return new Response(JSON.stringify({ error: 'Too many attempts. Request a new OTP.' }), { status: 400, headers: corsHeaders })
    }

    const inputHash = await sha256(`${normalizedEmail}:${cleanOtp}`)
    if (inputHash !== otpRow.otp_hash) {
      await supabase
        .from('custom_auth_otps')
        .update({ attempts: Number(otpRow.attempts || 0) + 1 })
        .eq('id', otpRow.id)

      return new Response(JSON.stringify({ error: 'OTP invalid.' }), { status: 400, headers: corsHeaders })
    }

    await supabase.from('custom_auth_otps').update({ verified: true }).eq('id', otpRow.id)

    const sessionToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await supabase.from('custom_auth_sessions').insert({
      token: sessionToken,
      email: normalizedEmail,
      provider: 'custom_otp',
      expires_at: expiresAt,
    })

    return new Response(
      JSON.stringify({
        sessionToken,
        email: normalizedEmail,
        expiresAt,
      }),
      { status: 200, headers: corsHeaders },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders })
  }
})
