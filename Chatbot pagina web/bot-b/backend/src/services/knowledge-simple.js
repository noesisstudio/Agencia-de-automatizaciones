/**
 * Knowledge Base Simple - Sin Supabase, sin embeddings complejos
 */

const fs = require('fs');
const path = require('path');

let knowledgeBase = '';
let sections = [];

function loadKnowledge() {
  try {
    // Rutas posibles desde src/services/
    const possiblePaths = [
      path.join(__dirname, '../../../noesis-conocimiento.md'),  // bot-b/noesis-conocimiento.md
      path.join(__dirname, '../../noesis-conocimiento.md'),     // backend/noesis-conocimiento.md
      path.join(__dirname, '../../conocimiento.md'),
      path.join(process.cwd(), 'noesis-conocimiento.md'),
      path.join(process.cwd(), '../noesis-conocimiento.md'),
    ];

    let filePath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        console.log(`DEBUG: Encontrado en ${filePath}`);
        break;
      }
    }

    if (!filePath) {
      console.warn('⚠️  No se encontró archivo de conocimiento en:');
      possiblePaths.forEach(p => console.warn(`   - ${p}`));
      console.warn('El chatbot funcionará sin contexto.');
      knowledgeBase = '';
      sections = [];
      return;
    }

    knowledgeBase = fs.readFileSync(filePath, 'utf-8');
    sections = knowledgeBase.split(/\n(?=#{1,3}\s)/);

    console.log(`✅ Base de conocimiento cargada: ${path.basename(filePath)}`);
    console.log(`   ${sections.length} secciones encontradas`);
  } catch (error) {
    console.error('❌ Error cargando base de conocimiento:', error.message);
    knowledgeBase = '';
    sections = [];
  }
}

function searchFragments(query, topK = 3) {
  if (!knowledgeBase) {
    return 'Base de conocimiento no disponible.';
  }

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);

  if (keywords.length === 0) return '';

  const scored = sections
    .map((section, idx) => {
      const sectionLower = section.toLowerCase();
      let score = 0;

      for (const keyword of keywords) {
        const matches = (sectionLower.match(new RegExp(keyword, 'g')) || []).length;
        score += matches;
      }

      return { section, score, idx };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (scored.length === 0) return '';

  return scored.map(s => s.section.trim()).join('\n\n---\n\n');
}

module.exports = {
  loadKnowledge,
  searchFragments,
  getFullKnowledge: () => knowledgeBase,
};
