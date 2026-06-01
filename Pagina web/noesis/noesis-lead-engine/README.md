# Noesis Lead Engine

Sistema inicial de captació per Noesis.

Objectiu: trobar empreses potencials, entendre què fan, proposar quin sistema Noesis els pot aportar valor, preparar un contacte personalitzat i deixar sempre una validació humana abans d'enviar.

## Principi operatiu

Noesis no ha de fer spam. Ha de construir una llista curta de bones oportunitats, amb criteri, context i missatges personalitzats.

El sistema es divideix en dos agents:

1. Research Agent
   - Busca empreses per sector i zona.
   - Extreu dades públiques.
   - Resumeix què fa cada empresa.
   - Detecta possibles friccions operatives.
   - Recomana quin sistema Noesis pot encaixar.
   - Assigna prioritat.

2. Personalization Agent
   - Escriu un missatge comercial breu i humà.
   - Evita un to agressiu de venda.
   - Explica per què Noesis pot aportar valor concret.
   - Prepara assumpte, email i possible missatge de seguiment.

## Validació humana

Cap email surt automàticament sense validació.

Flux:

1. Lead nou
2. Agent de recerca completa la fitxa
3. Agent de personalització proposa missatge
4. Miquel o soci valida
5. Es crea esborrany o s'envia manualment
6. Resposta del client classificada
7. Següent acció: reunió, seguiment futur o descartat

## Fitxers

- `data/leads_template.csv`: plantilla inicial tipus Excel.
- `outputs/noesis_lead_crm_template.xlsx`: plantilla local completa amb dashboard, CRM, llistes i guia.
- `google_sheets/noesis_leads_apps_script.gs`: automatització per Google Sheets i Gmail.
- `google_sheets/setup_google_sheets.md`: passos per instal·lar-ho al compte de Noesis.
- `docs/workflow.md`: procés complet de captació.
- `docs/crm_status.md`: estats del lead i significat.
- `prompts/research_agent.md`: prompt base per buscar i qualificar empreses.
- `prompts/personalization_agent.md`: prompt base per redactar contactes.
- `config/initial_segments.csv`: sectors inicials recomanats.

## Decisió operativa

Comencem amb Google Sheets + Apps Script, però mantenim una plantilla Excel/CSV local. Així Winston pot treballar amb els fitxers del projecte i l'equip pot operar des del compte de Noesis quan el full estigui instal·lat.

El primer objectiu no és automatitzar enviaments massius. És construir una llista curta de leads bons, entendre el procés que podem millorar i contactar només quan hi ha una hipòtesi clara de valor.

## MVP recomanat

Primera prova:

- Zona: Lleida i voltants.
- Sectors: gestories, clíniques dentals, perruqueries, barberies, fisioteràpia, immobiliàries i tallers.
- Volum: 50 leads.
- Objectiu: validar si podem aconseguir 5-10 respostes o converses reals.
