/**
 * RAG — Retrieval-Augmented Generation
 * Convierte la pregunta del usuario en un vector y busca
 * los fragmentos más relevantes de la base de conocimiento.
 * Usa text-embedding-3-small de OpenAI porque Anthropic no tiene
 * API de embeddings propia. Solo se usa para los embeddings,
 * no para generar respuestas — los datos no salen del flujo RAG.
 */

const https = require('https');
const supabase = require('./supabase');

const TENANT_ID = process.env.TENANT_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Genera el embedding de un texto usando el modelo de Anthropic
// Anthropic usa su propio endpoint de embeddings interno
async function getEmbedding(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'voyage-3',
      input: text,
      input_type: 'query',
    });

    // Voyage AI es el proveedor de embeddings recomendado por Anthropic
    // Es empresa con sede en EEUU — declararla en el DPA si el cliente es sensible
    // Alternativa EU: usar Cohere embed (empresa canadiense con servidores UE)
    const options = {
      hostname: 'api.voyageai.com',
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.data[0].embedding);
        } catch (e) {
          reject(new Error('Error parsing embedding response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Busca los fragmentos más relevantes en Supabase
async function searchKnowledge(query, options = {}) {
  const {
    matchThreshold = 0.7,
    matchCount = 5,
  } = options;

  const embedding = await getEmbedding(query);

  const { data, error } = await supabase.rpc('match_knowledge', {
    p_tenant_id: TENANT_ID,
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error('RAG search error:', error.message);
    return '';
  }

  if (!data || data.length === 0) return '';

  return data.map(chunk => chunk.content).join('\n\n---\n\n');
}

module.exports = { searchKnowledge, getEmbedding };
