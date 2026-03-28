# Custom 4-Digit OTP Deployment (Supabase)

## 1) Run SQL setup

In Supabase SQL Editor, run:

`SUPABASE_CUSTOM_OTP_SETUP.sql`

## 2) Install Supabase CLI and login

```bash
npm i -g supabase
supabase login
```

## 3) Link project

```bash
supabase link --project-ref ohhmigxrqdhluntehogq
```

## 4) Set Edge Function secrets

```bash
supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY
supabase secrets set FROM_EMAIL="Oxel <onboarding@resend.dev>"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available in function runtime automatically.

## 5) Deploy functions

```bash
supabase functions deploy send-custom-otp
supabase functions deploy verify-custom-otp
```

## 6) Test in app

- Open site
- Click protected action -> auth modal
- Enter email -> Send OTP
- Enter 4-digit OTP -> Verify

## 7) Fix for your previous form error

The error `Could not find the table 'public.site_inquiries'` is fixed after step 1 SQL is executed.
