/**
 * Noesis Lead Engine - Google Sheets automation
 *
 * Paste this file into Extensions > Apps Script inside the Noesis Leads Sheet.
 * The script creates a Noesis menu, prepares the CRM structure and creates
 * Gmail drafts only after a lead has been manually validated.
 */

const NOESIS = {
  leadsSheet: 'Leads_CRM',
  listsSheet: 'Llistes',
  configSheet: 'Configuracio',
  dashboardSheet: 'Dashboard',
  searchSheet: 'Cerques',
  maxRows: 500,
  headers: [
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
  ],
  statuses: [
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
  ],
  priorities: ['Alta', 'Mitjana', 'Baixa'],
  validation: ['Si', 'No'],
  systems: [
    'Documents i factures',
    'Cites i agenda',
    'Fluxos interns',
    'Diagnosi operativa',
    'No encaixa encara'
  ]
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Noesis')
    .addItem('Preparar CRM', 'setupNoesisCrm')
    .addItem('Preparar cerques', 'setupNoesisSearch')
    .addItem('Actualitzar dashboard', 'updateNoesisDashboard')
    .addSeparator()
    .addItem('Cercar empreses amb Places', 'searchNoesisPlacesLeads')
    .addItem('Crear esborranys validats', 'createNoesisDrafts')
    .addItem('Planificar seguiment 7 dies', 'scheduleNoesisFollowUps')
    .addToUi();
}

function setupNoesisCrm() {
  const ss = SpreadsheetApp.getActive();
  const leads = getOrCreateSheet_(ss, NOESIS.leadsSheet);
  const lists = getOrCreateSheet_(ss, NOESIS.listsSheet);
  const config = getOrCreateSheet_(ss, NOESIS.configSheet);
  const dashboard = getOrCreateSheet_(ss, NOESIS.dashboardSheet);
  const search = getOrCreateSheet_(ss, NOESIS.searchSheet);

  prepareLists_(lists);
  prepareConfig_(config);
  prepareLeads_(leads);
  prepareSearches_(search);
  prepareDashboard_(dashboard);
  updateNoesisDashboard();

  SpreadsheetApp.getUi().alert('CRM Noesis preparat. Ja pots comencar a afegir leads.');
}

function setupNoesisSearch() {
  const ss = SpreadsheetApp.getActive();
  prepareConfig_(getOrCreateSheet_(ss, NOESIS.configSheet));
  prepareSearches_(getOrCreateSheet_(ss, NOESIS.searchSheet));
  SpreadsheetApp.getUi().alert('Full de cerques preparat. Omple la Google Places API Key a Configuracio abans de cercar.');
}

function searchNoesisPlacesLeads() {
  const ss = SpreadsheetApp.getActive();
  const leads = ss.getSheetByName(NOESIS.leadsSheet);
  const searches = ss.getSheetByName(NOESIS.searchSheet);
  if (!leads) throw new Error('No trobo el full Leads_CRM.');
  if (!searches) throw new Error('No trobo el full Cerques. Executa Preparar cerques.');

  const apiKey = readSecret_('Google Places API Key');
  if (!apiKey) {
    SpreadsheetApp.getUi().alert('Falta la Google Places API Key al full Configuracio.');
    return;
  }

  const leadsMap = getHeaderMap_(leads);
  const existing = buildExistingLeadIndex_(leads, leadsMap);
  const searchMap = getHeaderMap_(searches);
  const lastRow = Math.max(searches.getLastRow(), 2);
  const rows = searches.getRange(2, 1, lastRow - 1, searches.getLastColumn()).getValues();

  let imported = 0;
  let duplicates = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const active = normalize_(cellByMap_(row, searchMap, 'Activa'));
    const query = cellByMap_(row, searchMap, 'Query');
    const city = cellByMap_(row, searchMap, 'Ciutat');
    const sector = cellByMap_(row, searchMap, 'Sector');
    const system = cellByMap_(row, searchMap, 'Sistema recomanat');
    const limit = Math.min(Number(cellByMap_(row, searchMap, 'Limit')) || 10, 20);

    if (active !== 'si' || !query || !city) return;

    const places = fetchPlacesTextSearch_(apiKey, query + ' ' + city, limit);
    let rowImported = 0;
    let rowDuplicates = 0;

    places.forEach(place => {
      const name = (place.displayName && place.displayName.text) || '';
      const website = place.websiteUri || '';
      const dedupeKey = normalize_(website || name + ' ' + city);
      if (!name || existing[dedupeKey]) {
        rowDuplicates += 1;
        return;
      }

      const leadId = nextLeadId_(leads, leadsMap, city);
      const now = new Date();
      const notes = [
        place.googleMapsUri ? 'Google Maps: ' + place.googleMapsUri : '',
        place.id ? 'Place ID: ' + place.id : '',
        place.formattedAddress ? 'Adreca: ' + place.formattedAddress : ''
      ].filter(Boolean).join('\n');

      const leadRow = emptyLeadRow_();
      setLeadValue_(leadRow, 'Lead ID', leadId);
      setLeadValue_(leadRow, 'Empresa', name);
      setLeadValue_(leadRow, 'Sector', sector || '');
      setLeadValue_(leadRow, 'Subsector', query);
      setLeadValue_(leadRow, 'Ciutat', city);
      setLeadValue_(leadRow, 'Provincia', inferProvince_(city));
      setLeadValue_(leadRow, 'Web', website);
      setLeadValue_(leadRow, 'Telefon', place.nationalPhoneNumber || '');
      setLeadValue_(leadRow, 'Font', 'Google Places: ' + query);
      setLeadValue_(leadRow, 'Estat', 'Nou');
      setLeadValue_(leadRow, 'Prioritat', 'Mitjana');
      setLeadValue_(leadRow, 'Sistema recomanat', system || 'Diagnosi operativa');
      setLeadValue_(leadRow, 'Benefici principal', benefitForSystem_(system));
      setLeadValue_(leadRow, 'Friccio detectada', frictionForSystem_(system));
      setLeadValue_(leadRow, 'Descripcio publica', place.formattedAddress || '');
      setLeadValue_(leadRow, 'Impacte estimat', impactForSystem_(system));
      setLeadValue_(leadRow, 'Validat per enviar', 'No');
      setLeadValue_(leadRow, 'Data afegit', now);
      setLeadValue_(leadRow, 'Notes', notes);

      leads.appendRow(leadRow);
      existing[dedupeKey] = true;
      imported += 1;
      rowImported += 1;
    });

    duplicates += rowDuplicates;
    searches.getRange(rowNumber, requireColumn_(searchMap, 'Resultat')).setValue('Importats: ' + rowImported + ' | Duplicats: ' + rowDuplicates);
    searches.getRange(rowNumber, requireColumn_(searchMap, 'Ultima cerca')).setValue(new Date());
  });

  updateNoesisDashboard();
  SpreadsheetApp.getUi().alert('Recerca completada.\nLeads importats: ' + imported + '\nDuplicats saltats: ' + duplicates);
}

function createNoesisDrafts() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(NOESIS.leadsSheet);
  if (!sheet) throw new Error('No trobo el full Leads_CRM.');

  const map = getHeaderMap_(sheet);
  const required = [
    'Email public',
    'Validat per enviar',
    'Assumpte email',
    'Email proposat',
    'Estat',
    'Data contacte',
    'Notes'
  ];
  required.forEach(name => requireColumn_(map, name));

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const lastCol = sheet.getLastColumn();
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const config = readConfig_();
  const signature = buildSignature_(config);
  const blockedStatuses = ['Esborrany creat', 'Contactat', 'Interessat', 'Reunio agendada', 'No interessat', 'Descartat', 'Client'];

  let created = 0;
  let skipped = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const email = cell_(row, map, 'Email public');
    const validated = normalize_(cell_(row, map, 'Validat per enviar'));
    const subject = cell_(row, map, 'Assumpte email');
    const body = cell_(row, map, 'Email proposat');
    const status = cell_(row, map, 'Estat') || 'Nou';

    if (!email && !subject && !body) return;
    if (validated !== 'si') {
      skipped += 1;
      return;
    }
    if (!email || !subject || !body) {
      appendNote_(sheet, rowNumber, map, 'Falta email, assumpte o cos del missatge.');
      skipped += 1;
      return;
    }
    if (blockedStatuses.indexOf(status) >= 0) {
      skipped += 1;
      return;
    }

    GmailApp.createDraft(email, subject, body + signature);
    setCell_(sheet, rowNumber, map, 'Estat', 'Esborrany creat');
    setCell_(sheet, rowNumber, map, 'Data contacte', new Date());
    appendNote_(sheet, rowNumber, map, 'Esborrany creat a Gmail.');
    created += 1;
  });

  updateNoesisDashboard();
  SpreadsheetApp.getUi().alert('Esborranys creats: ' + created + '\nFiles saltades: ' + skipped);
}

function scheduleNoesisFollowUps() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(NOESIS.leadsSheet);
  if (!sheet) throw new Error('No trobo el full Leads_CRM.');

  const map = getHeaderMap_(sheet);
  requireColumn_(map, 'Estat');
  requireColumn_(map, 'Data seguiment');

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const lastCol = sheet.getLastColumn();
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 7);

  let planned = 0;
  rows.forEach((row, index) => {
    const status = cell_(row, map, 'Estat');
    const rowNumber = index + 2;
    if (status === 'Esborrany creat' || status === 'Contactat' || status === 'Sense resposta') {
      setCell_(sheet, rowNumber, map, 'Data seguiment', followUpDate);
      appendNote_(sheet, rowNumber, map, 'Seguiment planificat a 7 dies.');
      planned += 1;
    }
  });

  SpreadsheetApp.getUi().alert('Seguiments planificats: ' + planned);
}

function updateNoesisDashboard() {
  const ss = SpreadsheetApp.getActive();
  const dashboard = ss.getSheetByName(NOESIS.dashboardSheet) || getOrCreateSheet_(ss, NOESIS.dashboardSheet);
  prepareDashboard_(dashboard);
}

function prepareLeads_(sheet) {
  sheet.clear();
  sheet.getRange(1, 1, 1, NOESIS.headers.length).setValues([NOESIS.headers]);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  const header = sheet.getRange(1, 1, 1, NOESIS.headers.length);
  header.setBackground('#0B3D35');
  header.setFontColor('#F8F5EC');
  header.setFontWeight('bold');
  header.setWrap(true);

  const widths = [95, 190, 140, 140, 120, 110, 190, 190, 120, 150, 135, 145, 100, 170, 220, 240, 260, 170, 120, 260, 420, 360, 105, 105, 105, 260, 280];
  widths.forEach((width, i) => sheet.setColumnWidth(i + 1, width));
  sheet.setRowHeight(1, 44);

  const bodyRange = sheet.getRange(2, 1, NOESIS.maxRows - 1, NOESIS.headers.length);
  bodyRange.setVerticalAlignment('top');
  bodyRange.setWrap(true);
  bodyRange.setFontColor('#263B38');

  setValidation_(sheet, 'Estat', NOESIS.statuses);
  setValidation_(sheet, 'Prioritat', NOESIS.priorities);
  setValidation_(sheet, 'Sistema recomanat', NOESIS.systems);
  setValidation_(sheet, 'Validat per enviar', NOESIS.validation);

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
  sheet.getRange(2, 1, 1, sample.length).setValues([sample]);

  applyConditionalFormats_(sheet);
}

function prepareLists_(sheet) {
  sheet.clear();
  const sections = [
    ['Estats', NOESIS.statuses],
    ['Prioritats', NOESIS.priorities],
    ['Sistemes', NOESIS.systems],
    ['Validacio', NOESIS.validation]
  ];

  let col = 1;
  sections.forEach(section => {
    const title = section[0];
    const values = section[1].map(v => [v]);
    sheet.getRange(1, col).setValue(title);
    sheet.getRange(2, col, values.length, 1).setValues(values);
    sheet.getRange(1, col).setBackground('#0B3D35').setFontColor('#F8F5EC').setFontWeight('bold');
    sheet.setColumnWidth(col, 180);
    col += 2;
  });
}

function prepareConfig_(sheet) {
  if (sheet.getLastRow() > 1) return;
  sheet.clear();
  const rows = [
    ['Camp', 'Valor'],
    ['Nom emissor', 'Miquel'],
    ['Empresa', 'Noesis'],
    ['Telefon', ''],
    ['Web', ''],
    ['Google Places API Key', ''],
    ['Frase tancament', 'Si no et resulta rellevant, digues-m ho i no insistirem.']
  ];
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange('A1:B1').setBackground('#0B3D35').setFontColor('#F8F5EC').setFontWeight('bold');
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 460);
}

function prepareSearches_(sheet) {
  sheet.clear();
  const headers = ['Activa', 'Query', 'Ciutat', 'Sector', 'Sistema recomanat', 'Limit', 'Ultima cerca', 'Resultat'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#0B3D35').setFontColor('#F8F5EC').setFontWeight('bold');
  sheet.setFrozenRows(1);
  const examples = [
    ['Si', 'clinica dental', 'Lleida', 'Salut', 'Cites i agenda', 10, '', ''],
    ['Si', 'gestoria', 'Lleida', 'Serveis professionals', 'Documents i factures', 10, '', ''],
    ['Si', 'perruqueria', 'Lleida', 'Serveis locals', 'Cites i agenda', 10, '', ''],
    ['No', 'fisioterapia', 'Lleida', 'Salut', 'Cites i agenda', 10, '', ''],
    ['No', 'immobiliaria', 'Lleida', 'Immobiliari', 'Fluxos interns', 10, '', '']
  ];
  sheet.getRange(2, 1, examples.length, headers.length).setValues(examples);
  [80, 190, 130, 180, 190, 80, 130, 260].forEach((width, i) => sheet.setColumnWidth(i + 1, width));
  sheet.getRange(2, 1, NOESIS.maxRows - 1, headers.length).setVerticalAlignment('top').setWrap(true);
  const map = getHeaderMap_(sheet);
  const activeRule = SpreadsheetApp.newDataValidation().requireValueInList(['Si', 'No'], true).setAllowInvalid(false).build();
  const systemRule = SpreadsheetApp.newDataValidation().requireValueInList(NOESIS.systems, true).setAllowInvalid(false).build();
  sheet.getRange(2, requireColumn_(map, 'Activa'), NOESIS.maxRows - 1, 1).setDataValidation(activeRule);
  sheet.getRange(2, requireColumn_(map, 'Sistema recomanat'), NOESIS.maxRows - 1, 1).setDataValidation(systemRule);
}

function prepareDashboard_(sheet) {
  sheet.clear();
  sheet.getRange('A1').setValue('Noesis Lead Engine');
  sheet.getRange('A2').setValue('Control simple de captacio: qualitat del lead, validacio humana i seguiment.');
  sheet.getRange('A1:G1').merge();
  sheet.getRange('A2:G2').merge();
  sheet.getRange('A1').setFontSize(26).setFontWeight('bold').setFontColor('#0B3D35');
  sheet.getRange('A2').setFontColor('#5F6F6C');

  const labels = [['Total leads', 'Validats', 'Esborranys/Contactats', 'Interes o reunio', 'Seguiment futur', 'Descartats']];
  const formulas = [[
    '=COUNTA(Leads_CRM!B2:B500)',
    '=COUNTIF(Leads_CRM!L2:L500,"Validat")',
    '=COUNTIF(Leads_CRM!L2:L500,"Esborrany creat")+COUNTIF(Leads_CRM!L2:L500,"Contactat")',
    '=COUNTIF(Leads_CRM!L2:L500,"Interessat")+COUNTIF(Leads_CRM!L2:L500,"Reunio agendada")+COUNTIF(Leads_CRM!L2:L500,"Client")',
    '=COUNTIF(Leads_CRM!L2:L500,"Seguiment futur")',
    '=COUNTIF(Leads_CRM!L2:L500,"No interessat")+COUNTIF(Leads_CRM!L2:L500,"Descartat")'
  ]];

  sheet.getRange('A4:F4').setValues(labels);
  sheet.getRange('A5:F5').setFormulas(formulas);
  sheet.getRange('A4:F5').setHorizontalAlignment('center');
  sheet.getRange('A4:F4').setBackground('#EAF3EF').setFontColor('#0B3D35').setFontWeight('bold');
  sheet.getRange('A5:F5').setFontSize(18).setFontWeight('bold').setFontColor('#0B3D35');

  const guide = [
    ['Flux recomanat'],
    ['1. Afegir lead o importar llista curta.'],
    ['2. Enriquir amb context real: sector, web, friccio i sistema recomanat.'],
    ['3. Generar email proposat i revisar-lo com si fos una conversa humana.'],
    ['4. Marcar "Validat per enviar" = Si nomes quan el contacte encaixa.'],
    ['5. Crear esborrany a Gmail, revisar i enviar manualment.'],
    ['6. Classificar resposta i posar data de seguiment.']
  ];
  sheet.getRange(8, 1, guide.length, 1).setValues(guide);
  sheet.getRange('A8').setFontWeight('bold').setFontColor('#0B3D35');
  sheet.getRange('A9:A14').setFontColor('#4F615E');
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 140);
}

function fetchPlacesTextSearch_(apiKey, query, limit) {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const payload = {
    textQuery: query,
    languageCode: 'ca',
    regionCode: 'ES',
    pageSize: limit
  };
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.googleMapsUri',
        'places.primaryType',
        'places.types'
      ].join(',')
    }
  });
  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Error Places API ' + code + ': ' + text);
  }
  const data = JSON.parse(text);
  return data.places || [];
}

function buildExistingLeadIndex_(sheet, map) {
  const index = {};
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  rows.forEach(row => {
    const company = cell_(row, map, 'Empresa');
    const web = cell_(row, map, 'Web');
    const city = cell_(row, map, 'Ciutat');
    if (company || web) index[normalize_(web || company + ' ' + city)] = true;
  });
  return index;
}

function emptyLeadRow_() {
  return NOESIS.headers.map(() => '');
}

function setLeadValue_(row, headerName, value) {
  const index = NOESIS.headers.indexOf(headerName);
  if (index >= 0) row[index] = value;
}

function nextLeadId_(sheet, map, city) {
  const prefix = (city || 'LEAD').substring(0, 3).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const col = requireColumn_(map, 'Lead ID');
  const values = sheet.getRange(2, col, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
  let max = 0;
  values.forEach(value => {
    const match = String(value || '').match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return prefix + '-' + String(max + 1).padStart(4, '0');
}

function inferProvince_(city) {
  const value = normalize_(city);
  if (value.indexOf('lleida') >= 0) return 'Lleida';
  return '';
}

function benefitForSystem_(system) {
  const value = normalize_(system);
  if (value.indexOf('cites') >= 0) return 'Menys temps gestionant reserves i canvis d agenda.';
  if (value.indexOf('documents') >= 0) return 'Documents mes ordenats i menys revisio manual.';
  if (value.indexOf('fluxos') >= 0) return 'Informacio connectada i menys tasques repetitives.';
  return 'Diagnosi per detectar temps recuperable i friccions operatives.';
}

function frictionForSystem_(system) {
  const value = normalize_(system);
  if (value.indexOf('cites') >= 0) return 'Reserves, recordatoris i canvis que poden dependre massa de seguiment manual.';
  if (value.indexOf('documents') >= 0) return 'Recepcio, classificacio i validacio de documents que pot consumir hores recurrents.';
  if (value.indexOf('fluxos') >= 0) return 'Correus, formularis, documents i tasques que poden quedar dispersos.';
  return 'Processos repetitius encara no quantificats.';
}

function impactForSystem_(system) {
  const value = normalize_(system);
  if (value.indexOf('cites') >= 0) return 'Temps recuperat, menys buits i millor resposta al client.';
  if (value.indexOf('documents') >= 0) return 'Menys errors, menys revisio i mes control documental.';
  if (value.indexOf('fluxos') >= 0) return 'Menys friccio interna i mes velocitat de resposta.';
  return 'Ordre, temps recuperat i impacte mesurable.';
}

function readSecret_(name) {
  const props = PropertiesService.getScriptProperties();
  const propValue = props.getProperty(name);
  if (propValue) return propValue;
  const config = readConfig_();
  return config[normalize_(name)] || '';
}

function cellByMap_(row, map, name) {
  const col = requireColumn_(map, name);
  return row[col - 1];
}

function setValidation_(sheet, headerName, values) {
  const map = getHeaderMap_(sheet);
  const col = requireColumn_(map, headerName);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, NOESIS.maxRows - 1, 1).setDataValidation(rule);
}

function applyConditionalFormats_(sheet) {
  const map = getHeaderMap_(sheet);
  const statusCol = requireColumn_(map, 'Estat');
  const priorityCol = requireColumn_(map, 'Prioritat');
  const validCol = requireColumn_(map, 'Validat per enviar');
  const statusRange = sheet.getRange(2, statusCol, NOESIS.maxRows - 1, 1);
  const priorityRange = sheet.getRange(2, priorityCol, NOESIS.maxRows - 1, 1);
  const validRange = sheet.getRange(2, validCol, NOESIS.maxRows - 1, 1);

  const rules = [
    textRule_(statusRange, 'Interessat', '#DCEFE9', '#0B3D35'),
    textRule_(statusRange, 'Reunio agendada', '#DCEFE9', '#0B3D35'),
    textRule_(statusRange, 'Client', '#BFE3D8', '#0B3D35'),
    textRule_(statusRange, 'Seguiment futur', '#FFF1C2', '#6A4A00'),
    textRule_(statusRange, 'No interessat', '#F4D6D2', '#7A211A'),
    textRule_(statusRange, 'Descartat', '#E8E1DD', '#5A4C46'),
    textRule_(priorityRange, 'Alta', '#F6D1C8', '#7A211A'),
    textRule_(priorityRange, 'Mitjana', '#FFF1C2', '#6A4A00'),
    textRule_(priorityRange, 'Baixa', '#E8EFEA', '#50635F'),
    textRule_(validRange, 'Si', '#DCEFE9', '#0B3D35'),
    textRule_(validRange, 'No', '#F3EEE4', '#7D6D5B')
  ];
  sheet.setConditionalFormatRules(rules);
}

function textRule_(range, text, background, color) {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(text)
    .setBackground(background)
    .setFontColor(color)
    .setRanges([range])
    .build();
}

function readConfig_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(NOESIS.configSheet);
  const values = sheet ? sheet.getDataRange().getValues() : [];
  const config = {};
  values.slice(1).forEach(row => {
    if (row[0]) config[normalize_(row[0])] = row[1] || '';
  });
  return config;
}

function buildSignature_(config) {
  const name = config[normalize_('Nom emissor')] || 'Miquel';
  const company = config[normalize_('Empresa')] || 'Noesis';
  const phone = config[normalize_('Telefon')] || '';
  const web = config[normalize_('Web')] || '';
  const closing = config[normalize_('Frase tancament')] || 'Si no et resulta rellevant, digues-m ho i no insistirem.';
  const lines = ['', '', closing, '', name, company];
  if (phone) lines.push(phone);
  if (web) lines.push(web);
  return lines.join('\n');
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    if (header) map[normalize_(header)] = index + 1;
  });
  return map;
}

function requireColumn_(map, name) {
  const col = map[normalize_(name)];
  if (!col) throw new Error('Falta la columna: ' + name);
  return col;
}

function cell_(row, map, name) {
  const col = requireColumn_(map, name);
  return row[col - 1];
}

function setCell_(sheet, rowNumber, map, name, value) {
  sheet.getRange(rowNumber, requireColumn_(map, name)).setValue(value);
}

function appendNote_(sheet, rowNumber, map, message) {
  const col = requireColumn_(map, 'Notes');
  const cell = sheet.getRange(rowNumber, col);
  const current = cell.getValue();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  cell.setValue((current ? current + '\n' : '') + stamp + ' - ' + message);
}

function normalize_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
