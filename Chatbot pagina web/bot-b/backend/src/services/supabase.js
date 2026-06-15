// Mock de Supabase para desarrollo sin BD
// En producción, reemplaza con Supabase real

module.exports = {
  from: () => ({
    insert: async () => ({ data: null, error: null }),
    select: async () => ({ data: [], error: null }),
  }),
  rpc: async () => ({ data: [], error: null }),
};
