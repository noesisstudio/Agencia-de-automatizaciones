import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const root = path.resolve('C:/Users/mikic/Documents/New project 2/noesis-lead-engine');
const outputDir = path.join(root, 'outputs');
const outputPath = path.join(outputDir, 'noesis_lead_crm_template.xlsx');
const dashboardPreviewPath = path.join(outputDir, 'noesis_crm_dashboard_preview.png');
const leadsPreviewPath = path.join(outputDir, 'noesis_crm_leads_preview.png');

const colors = {
  ink: '#0B3D35',
  teal: '#24897C',
  cream: '#F8F5EC',
  paper: '#FBF8F0',
  grid: '#D8DED7',
  muted: '#5F6F6C',
  sand: '#EDE5D8',
  rose: '#F1D8D1',
  amber: '#FFF1C2',
  greenSoft: '#DCEFE9'
};

const headers = [
  'Lead ID',
  'Empresa',
  'Sector',
  'Subsector',
  'Ciutat',
  'Provincia',
  'Web',
  'Email public',
  'Telefon',
  'Persona contacte',
  'Font',
  'Estat',
  'Prioritat',
  'Sistema recomanat',
  'Benefici principal',
  'Friccio detectada',
  'Descripcio publica',
  'Impacte estimat',
  'Validat per enviar',
  'Assumpte email',
  'Email proposat',
  'Seguiment proposat',
  'Data afegit',
  'Data contacte',
  'Data seguiment',
  'Ultima resposta',
  'Notes'
];

const statuses = [
  'Nou',
  'Recerca pendent',
  'Enriquit',
  'Pendent validacio',
  'Validat',
  'Esborrany creat',
  'Contactat',
  'Sense resposta',
  'Interessat',
  'Reunio agendada',
  'Seguiment futur',
  'No interessat',
  'Descartat',
  'Client'
];

const priorities = ['Alta', 'Mitjana', 'Baixa'];
const systems = ['Documents i factures', 'Cites i agenda', 'Fluxos interns', 'Diagnosi operativa', 'No encaixa encara'];
const validation = ['Si', 'No'];

function letter(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function rangeFor(row, col, rows, cols) {
  const start = `${letter(col)}${row}`;
  const end = `${letter(col + cols - 1)}${row + rows - 1}`;
  return `${start}:${end}`;
}

function setWidths(sheet, widths, maxRows = 80) {
  widths.forEach((width, index) => {
    sheet.getRange(`${letter(index)}1:${letter(index)}${maxRows}`).format.columnWidthPx = width;
  });
}

function formatPanel(range, fill = '#FFFFFF') {
  range.format = {
    fill,
    font: { name: 'Aptos', size: 11, color: '#263B38' },
    borders: { preset: 'outside', style: 'thin', color: colors.grid },
    verticalAlignment: 'center',
    wrapText: true
  };
}

const workbook = Workbook.create();
const dashboard = workbook.worksheets.getOrAdd('Dashboard', { renameFirstIfOnlyNewSpreadsheet: true });
dashboard.reset();
const leads = workbook.worksheets.getOrAdd('Leads_CRM');
leads.reset();
const lists = workbook.worksheets.getOrAdd('Llistes');
lists.reset();
const guide = workbook.worksheets.getOrAdd('Guia');
guide.reset();

dashboard.getRange('A1:G1').merge();
dashboard.getRange('A2:G2').merge();
dashboard.getRange('A1').values = [['Noesis Lead Engine']];
dashboard.getRange('A2').values = [['CRM inicial per trobar, prioritzar i contactar empreses amb criteri.']];
dashboard.getRange('A1').format = { font: { name: 'Georgia', size: 30, bold: true, color: colors.ink }, fill: colors.paper };
dashboard.getRange('A2').format = { font: { name: 'Aptos', size: 12, color: colors.muted }, fill: colors.paper };
dashboard.getRange('A1:G22').format.fill = colors.paper;
dashboard.getRange('A1:G1').format.rowHeightPx = 56;
dashboard.getRange('A2:G2').format.rowHeightPx = 28;
dashboard.getRange('A4:F4').format.rowHeightPx = 30;
dashboard.getRange('A5:F5').format.rowHeightPx = 42;
dashboard.getRange('A8:G8').format.rowHeightPx = 44;
dashboard.getRange('A9:G13').format.rowHeightPx = 54;
setWidths(dashboard, [180, 160, 190, 170, 160, 150, 170], 40);

dashboard.getRange('A4:F4').values = [['Total leads', 'Validats', 'Esborranys / contactats', 'Interes o reunio', 'Seguiment futur', 'Descartats']];
dashboard.getRange('A5:F5').formulas = [[
  '=COUNTA(Leads_CRM!B2:B500)',
  '=COUNTIF(Leads_CRM!L2:L500,"Validat")',
  '=COUNTIF(Leads_CRM!L2:L500,"Esborrany creat")+COUNTIF(Leads_CRM!L2:L500,"Contactat")',
  '=COUNTIF(Leads_CRM!L2:L500,"Interessat")+COUNTIF(Leads_CRM!L2:L500,"Reunio agendada")+COUNTIF(Leads_CRM!L2:L500,"Client")',
  '=COUNTIF(Leads_CRM!L2:L500,"Seguiment futur")',
  '=COUNTIF(Leads_CRM!L2:L500,"No interessat")+COUNTIF(Leads_CRM!L2:L500,"Descartat")'
]];
dashboard.getRange('A4:F4').format = {
  fill: colors.greenSoft,
  font: { name: 'Aptos', size: 11, bold: true, color: colors.ink },
  horizontalAlignment: 'center',
  borders: { preset: 'outside', style: 'thin', color: colors.grid }
};
dashboard.getRange('A5:F5').format = {
  fill: '#FFFFFF',
  font: { name: 'Georgia', size: 22, bold: true, color: colors.ink },
  horizontalAlignment: 'center',
  borders: { preset: 'outside', style: 'thin', color: colors.grid }
};

dashboard.getRange('A8:C8').merge();
dashboard.getRange('A8').values = [['Flux de captacio']];
dashboard.getRange('A8').format = { font: { name: 'Georgia', size: 18, bold: true, color: colors.ink }, fill: colors.paper };
const flowRows = [
  ['01', 'Recerca', 'Trobar empreses amb context suficient, no llistes massives.'],
  ['02', 'Enriquiment', 'Entendre sector, friccio operativa i sistema Noesis probable.'],
  ['03', 'Validacio', 'Miquel o el soci decideixen si el contacte te sentit.'],
  ['04', 'Esborrany', 'Gmail prepara el correu, pero l envio final es huma.'],
  ['05', 'Seguiment', 'Classificar resposta i preparar la propera accio.']
];
dashboard.getRange('A9:C13').values = flowRows;
formatPanel(dashboard.getRange('A9:C13'), '#FFFFFF');
dashboard.getRange('A9:A13').format.font = { bold: true, color: colors.teal };

dashboard.getRange('E8:G8').merge();
dashboard.getRange('E8').values = [['Criteri CEO']];
dashboard.getRange('E8').format = { font: { name: 'Georgia', size: 18, bold: true, color: colors.ink }, fill: colors.paper };
dashboard.getRange('E9:G13').merge();
dashboard.getRange('E9').values = [[
  'Noesis no ha de semblar una eina massiva d email. Ha de semblar una empresa que observa processos, detecta oportunitats i proposa millores concretes. El CRM esta pensat per obligar-nos a validar qualitat abans de contactar.'
]];
formatPanel(dashboard.getRange('E9:G13'), '#FFFFFF');

leads.getRange(rangeFor(1, 0, 1, headers.length)).values = [headers];
const sample = [
  'LLE-0001',
  'Exemple Dental Lleida',
  'Salut',
  'Clinica dental',
  'Lleida',
  'Lleida',
  'https://exemple.com',
  'info@exemple.com',
  '',
  '',
  'Recerca manual',
  'Pendent validacio',
  'Mitjana',
  'Cites i agenda',
  'Menys temps perseguint reserves i recordatoris.',
  'Agenda manual, trucades recurrents i recordatoris que depenen de l equip.',
  'Clinica local amb flux de cites recurrent.',
  'Hores recuperables i menys buits d agenda.',
  'No',
  'Idea per ordenar reserves i seguiments',
  'Hola,\n\nSoc Miquel, de Noesis. He vist que treballeu amb un volum recurrent de cites i seguiment de pacients. Nosaltres ajudem empreses a ordenar processos repetitius amb sistemes digitals simples i mesurables.\n\nCrec que en el vostre cas podria tenir sentit revisar si hi ha hores que es perden en reserves, recordatoris o canvis d agenda. No us escric per vendre una eina tancada, sino per detectar si hi ha una part del proces que es pot simplificar.\n\nSi us encaixa, podem fer una primera diagnosi breu i dir-vos on hi podria haver millora real.',
  'Hola,\n\nEt recupero aquest missatge per si te sentit parlar-ne mes endavant. La idea seria revisar-ho de forma molt concreta, sense compromisos ni llenguatge tecnic innecessari.',
  new Date(),
  '',
  '',
  '',
  'Fila d exemple. Duplicar o substituir.'
];
leads.getRange(rangeFor(2, 0, 1, sample.length)).values = [sample];
leads.freezePanes.freezeRows(1);
leads.freezePanes.freezeColumns(2);
leads.getRange(rangeFor(1, 0, 1, headers.length)).format = {
  fill: colors.ink,
  font: { name: 'Aptos', size: 10, color: colors.cream, bold: true },
  borders: { preset: 'outside', style: 'thin', color: colors.ink },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  wrapText: true
};
leads.getRange(rangeFor(2, 0, 25, headers.length)).format = {
  fill: '#FFFFFF',
  font: { name: 'Aptos', size: 10, color: '#263B38' },
  borders: { preset: 'outside', style: 'thin', color: colors.grid },
  verticalAlignment: 'top',
  wrapText: true
};
setWidths(leads, [95, 190, 135, 135, 115, 105, 180, 180, 120, 150, 130, 145, 95, 170, 220, 240, 260, 170, 120, 260, 420, 360, 105, 105, 105, 250, 280], 60);

const statusColumn = headers.indexOf('Estat');
const priorityColumn = headers.indexOf('Prioritat');
const systemColumn = headers.indexOf('Sistema recomanat');
const validationColumn = headers.indexOf('Validat per enviar');
leads.getRange(`${letter(statusColumn)}2:${letter(statusColumn)}500`).dataValidation = { allowBlank: true, list: { inCellDropDown: true, source: statuses } };
leads.getRange(`${letter(priorityColumn)}2:${letter(priorityColumn)}500`).dataValidation = { allowBlank: true, list: { inCellDropDown: true, source: priorities } };
leads.getRange(`${letter(systemColumn)}2:${letter(systemColumn)}500`).dataValidation = { allowBlank: true, list: { inCellDropDown: true, source: systems } };
leads.getRange(`${letter(validationColumn)}2:${letter(validationColumn)}500`).dataValidation = { allowBlank: true, list: { inCellDropDown: true, source: validation } };

const statusRange = leads.getRange(`${letter(statusColumn)}2:${letter(statusColumn)}500`);
statusRange.conditionalFormats.add('containsText', { text: 'Interessat', format: { fill: colors.greenSoft, font: { color: colors.ink, bold: true } } });
statusRange.conditionalFormats.add('containsText', { text: 'Reunio agendada', format: { fill: colors.greenSoft, font: { color: colors.ink, bold: true } } });
statusRange.conditionalFormats.add('containsText', { text: 'Seguiment futur', format: { fill: colors.amber, font: { color: '#6A4A00', bold: true } } });
statusRange.conditionalFormats.add('containsText', { text: 'No interessat', format: { fill: colors.rose, font: { color: '#7A211A', bold: true } } });

const validRange = leads.getRange(`${letter(validationColumn)}2:${letter(validationColumn)}500`);
validRange.conditionalFormats.add('containsText', { text: 'Si', format: { fill: colors.greenSoft, font: { color: colors.ink, bold: true } } });
validRange.conditionalFormats.add('containsText', { text: 'No', format: { fill: colors.sand, font: { color: '#7D6D5B' } } });

const sections = [
  ['Estats', statuses],
  ['Prioritats', priorities],
  ['Sistemes', systems],
  ['Validacio', validation]
];
let col = 0;
sections.forEach(([title, items]) => {
  lists.getRange(`${letter(col)}1`).values = [[title]];
  lists.getRange(rangeFor(2, col, items.length, 1)).values = items.map(item => [item]);
  lists.getRange(`${letter(col)}1`).format = { fill: colors.ink, font: { color: colors.cream, bold: true } };
  lists.getRange(rangeFor(2, col, items.length, 1)).format = { fill: '#FFFFFF', font: { color: '#263B38' }, borders: { preset: 'outside', style: 'thin', color: colors.grid } };
  lists.getRange(`${letter(col)}1:${letter(col)}30`).format.columnWidthPx = 190;
  col += 2;
});

guide.getRange('A1:D1').merge();
guide.getRange('A1').values = [['Guia operativa Noesis']];
guide.getRange('A1').format = { font: { name: 'Georgia', size: 26, bold: true, color: colors.ink }, fill: colors.paper };
guide.getRange('A3:D9').values = [
  ['Pas', 'Objectiu', 'Responsable', 'Criteri de qualitat'],
  ['1. Recerca', 'Trobar empreses amb dades publiques suficients.', 'Research Agent / Winston', 'No inventar dades. Si no hi ha email public, deixar buit.'],
  ['2. Enriquiment', 'Entendre sector, friccio i sistema recomanat.', 'Research Agent / Winston', 'Explicar per que encaixa, no nomes classificar.'],
  ['3. Personalitzacio', 'Preparar email amb context real.', 'Personalization Agent / Winston', 'Missatge huma, curt i sense promeses buides.'],
  ['4. Validacio', 'Decidir si s envia.', 'Miquel / soci', 'Si no hi ha valor clar, no es contacta.'],
  ['5. Esborrany', 'Crear email a Gmail.', 'Apps Script', 'Esborrany, no enviament automatic al principi.'],
  ['6. Seguiment', 'Classificar resposta i propera accio.', 'Miquel / soci', 'Interessat, reunio, seguiment futur o descartat.']
];
guide.getRange('A3:D3').format = { fill: colors.ink, font: { color: colors.cream, bold: true }, horizontalAlignment: 'center' };
guide.getRange('A4:D9').format = { fill: '#FFFFFF', font: { color: '#263B38' }, borders: { preset: 'outside', style: 'thin', color: colors.grid }, wrapText: true, verticalAlignment: 'top' };
setWidths(guide, [140, 300, 210, 380], 25);

await fs.mkdir(outputDir, { recursive: true });

const dashInspect = await workbook.inspect({
  kind: 'table',
  range: 'Dashboard!A1:G14',
  include: 'values,formulas',
  tableMaxRows: 20,
  tableMaxCols: 8
});
console.log(dashInspect.ndjson);

const errorScan = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'formula error scan'
});
console.log(errorScan.ndjson);

const dashPreview = await workbook.render({ sheetName: 'Dashboard', range: 'A1:G16', format: 'png', scale: 2 });
await fs.writeFile(dashboardPreviewPath, Buffer.from(await dashPreview.arrayBuffer()));
const leadsPreview = await workbook.render({ sheetName: 'Leads_CRM', range: 'A1:L12', format: 'png', scale: 2 });
await fs.writeFile(leadsPreviewPath, Buffer.from(await leadsPreview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
