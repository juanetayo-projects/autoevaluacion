import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { accion, email, password, nombre, role, id } = await req.json()

  // Bootstrap: mientras no exista ningún admin, se permite crear el
  // primero sin autenticación previa (huevo-gallina). En cuanto exista un
  // admin, esta puerta se cierra sola y todo pasa por la verificación normal.
  const { count: totalAdmins } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')

  let esBootstrap = false
  if (accion === 'crear' && role === 'admin' && (totalAdmins ?? 0) === 0) {
    esBootstrap = true
  }

  if (!esBootstrap) {
    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json(401, { error: 'No autenticado' })

    const { data: perfil } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (perfil?.role !== 'admin') return json(403, { error: 'Solo admin' })
  }

  if (accion === 'crear') {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) return json(400, { error: error.message })
    const { error: errorPerfil } = await admin
      .from('profiles')
      .insert({ id: data.user.id, email, nombre, role })
    if (errorPerfil) {
      await admin.auth.admin.deleteUser(data.user.id)
      return json(400, { error: errorPerfil.message })
    }
    return json(200, { ok: true, id: data.user.id })
  }

  if (accion === 'eliminar') {
    await admin.auth.admin.deleteUser(id)
    await admin.from('profiles').delete().eq('id', id)
    return json(200, { ok: true })
  }

  if (accion === 'reset') {
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return json(400, { error: error.message })
    return json(200, { ok: true })
  }

  return json(400, { error: 'Acción inválida' })
})

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
