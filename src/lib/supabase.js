import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ydkwztrtwmgvgyorwmfb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlka3d6dHJ0d21ndmd5b3J3bWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTIxODQsImV4cCI6MjA5NTQ4ODE4NH0.V9KwXj4Ce4nB4OE291vkfnco4zvwGr7_sITHXRtXayc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)