/**
 * Script para cargar la base de conocimiento del cliente en Supabase.
 * Ejecutar una vez en el setup y cada vez que el cliente actualice su documentación.
 *
 * Uso:
 *   node scripts/upload-knowledge.js ./conocimiento/cliente.md
 *   node scripts/upload-knowledge.js ./conocimiento/  (carga todos los .md y .txt de la carpeta)
 *
 * Requisitos:
 *   - .env configurado con SUPABASE_URL, SUPABASE_SERVICE_KEY, VOYAGE_API_KEY, TENANT_ID
 *   - npm install ejecutado
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TENANT_ID = process.env.TENANT_ID;
const CHUNK_SIZE = 500;       // palabras por fragmento
const CHUNK_OVERLAP = 50;     // palabras de solapamiento entre fragmentos

// ── Helpers ──────────────────────────────────────────────────────────────────

function splitIntoChunks(text) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '));
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.trim().length > 50);
}

function getEmbedding(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'voyage-3', input: text, input_type: 'document' });
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
          resolve(JSON.parse(data).data[0].embedding);
        } catch (e) {
          reject(new Error('Error parsing embedding: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Proceso principal ─────────────────────────────────────────────────────────

async function loadFile(filePath) {
  const source = path.basename(filePath);
  const text = fs.readFileSync(filePath, 'utf-8');
  const chunks = splitIntoChunks(text);

  console.log(`\n📄 ${source} → ${chunks.length} fragmentos`);

  // Borrar fragmentos anteriores del mismo fichero para este tenant
  await supabase
    .from('knowledge_chunks')
    .delete()
    .eq('tenant_id', TENANT_ID)
    .eq('source', source);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    process.stdout.write(`  [${i + 1}/${chunks.length}] generando embedding...`);

    const embedding = await getEmbedding(chunk);

    const { error } = await supabase.from('knowledge_chunks').insert({
      tenant_id: TENANT_ID,
      content: chunk,
      embedding,
      source,
    });

    if (error) {
      console.error(`\n  ❌ Error insertando fragmento ${i + 1}:`, error.message);
    } else {
      process.stdout.write(' ✓\n');
    }

    // Pausa pequeña para no saturar la API de embeddings
    if (i < chunks.length - 1) await sleep(200);
  }
}

async function main() {
  if (!TENANT_ID) {
    console.error('❌ TENANT_ID no configurado en .env');
    process.exit(1);
  }

  const target = process.argv[2];
  if (!target) {
    console.error('❌ Uso: node scripts/upload-knowledge.js <fichero.md|carpeta/>');
    process.exit(1);
  }

  const stat = fs.statSync(target);
  const files = stat.isDirectory()
    ? fs.readdirSync(target)
        .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
        .map(f => path.join(target, f))
    : [target];

  if (files.length === 0) {
    console.error('❌ No se encontraron ficheros .md o .txt en', target);
    process.exit(1);
  }

  console.log(`\n🚀 Cargando conocimiento para tenant: ${TENANT_ID}`);
  console.log(`   Ficheros: ${files.length}`);

  for (const file of files) {
    await loadFile(file);
  }

  console.log('\n✅ Base de conocimiento actualizada correctamente.');
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
