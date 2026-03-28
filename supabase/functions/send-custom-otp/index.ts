import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Oxel <onboarding@resend.dev>'

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
    const { email } = await req.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail) {
      return new Response(JSON.stringify({ error: 'Email is required.' }), { status: 400, headers: corsHeaders })
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000))
    const otpHash = await sha256(`${normalizedEmail}:${otp}`)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await supabase.from('custom_auth_otps').insert({
      email: normalizedEmail,
      otp_hash: otpHash,
      expires_at: expiresAt,
    })

    const mailPayload = {
      from: FROM_EMAIL,
      to: [normalizedEmail],
      subject: 'Your Oxel login OTP',
      html: `<p>Your 4-digit OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
    }

    const mailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    })

    if (!mailRes.ok) {
      const text = await mailRes.text()
      return new Response(JSON.stringify({ error: `Email send failed: ${text}` }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders })
  }
})
