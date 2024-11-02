const { createClient } = require('@supabase/supabase-js')

// Verificar variables de entorno requeridas
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Las variables de entorno de Supabase son requeridas')
}

// Crear cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    }
  }
)

// Función helper para verificar conexión
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) throw error
    console.log('Conexión a Supabase establecida correctamente')
    return true
  } catch (error) {
    console.error('Error conectando a Supabase:', error.message)
    return false
  }
}

module.exports = {
  supabase,
  testConnection
}
