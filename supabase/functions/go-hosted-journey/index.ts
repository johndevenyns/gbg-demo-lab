import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Direct integration with GBG GO v2 hosted journeys (US production).
// No Ditto involved: we exchange the client credentials for an access token,
// start a journey instance, and return the one-time hosted URL to embed.

const TOKEN_URL = 'https://api.auth.gbgplc.com/as/token.oauth2'
const API_BASE = 'https://us.platform.go.gbgplc.com/v2/captain'

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GO_CLIENT_ID')
  const clientSecret = Deno.env.get('GO_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error('GO client credentials are not configured')
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'gbg.token',
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GO auth failed (${res.status}): ${text.slice(0, 300)}`)
  }

  const data = await res.json()
  return data.access_token as string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json().catch(() => ({}))
    const action = payload?.action as string | undefined

    const token = await getAccessToken()

    if (action === 'start') {
      const resourceId = Deno.env.get('GO_RESOURCE_ID')
      if (!resourceId) throw new Error('GO resource ID is not configured')

      // Version: default to latest published version.
      const version = (payload?.version as string | undefined) || 'latest'
      const fullResourceId = `${resourceId}@${version}`

      // Optional prefill of identity data collected in earlier form steps.
      const subject = payload?.subject && typeof payload.subject === 'object'
        ? payload.subject
        : {}

      const res = await fetch(`${API_BASE}/journey/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceId: fullResourceId,
          context: {
            config: { delivery: 'page' },
            subject,
          },
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return json({ error: 'GO journey start failed', status: res.status, details: data }, 502)
      }

      return json({
        instanceId: data.instanceId,
        status: data.status,
        url: data.instanceUrl,
      })
    }

    if (action === 'status') {
      const instanceId = payload?.instanceId as string | undefined
      if (!instanceId || typeof instanceId !== 'string') {
        return json({ error: 'instanceId is required' }, 400)
      }

      const res = await fetch(`${API_BASE}/journey/state/fetch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceId }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return json({ error: 'GO journey state fetch failed', status: res.status, details: data }, 502)
      }

      return json({
        instanceId: data.instanceId,
        status: data.status,
        result: data.result ?? null,
      })
    }

    return json({ error: 'Unknown action. Use "start" or "status".' }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
