import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Fetch org id (adjust as needed)
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'No profile/org' }, { status: 400 })

  const { data, error } = await supabase
    .from('form_configs')
    .select('config')
    .eq('organization_id', profile.organization_id)
    .single()
  
  // If no config exists for this organization, return default config
  if (error && error.code === 'PGRST116') {
    console.log("No form config found for organization, returning default")
    const defaultConfig = [
      {
        "section": "Personal Information",
        "enabled": true,
        "fields": [
          { "name": "first_name", "label": "First Name", "type": "text", "required": true },
          { "name": "last_name", "label": "Last Name", "type": "text", "required": true }
        ]
      },
      {
        "section": "Health & Support Information",
        "enabled": true,
        "fields": [
          { "name": "allergies", "label": "Allergies", "type": "textarea" }
        ]
      },
      {
        "section": "Funding Information",
        "enabled": true,
        "fields": [
          { "name": "funding_source", "label": "Funding Source", "type": "select", "options": ["NDIS", "Private"] }
        ]
      }
    ]
    return NextResponse.json(defaultConfig)
  }
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.config || [])
}

export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'No profile/org' }, { status: 400 })

  const body = await req.json()
  const { config } = body

  const { error } = await supabase
    .from('form_configs')
    .upsert({ organization_id: profile.organization_id, config })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
} 