# Instal·lació del CRM Noesis a Google Sheets

Aquest sistema està pensat per començar ràpid: leads en un full, validació humana i esborranys de Gmail només quan tu ho marques.

## Opció recomanada

1. Entra al correu de Noesis.
2. Crea un Google Sheet nou amb el nom `Noesis Leads`.
3. Ves a `Extensions > Apps Script`.
4. Esborra el codi que hi surti per defecte.
5. Enganxa tot el contingut de `google_sheets/noesis_leads_apps_script.gs`.
6. Desa el projecte amb el nom `Noesis Lead Engine`.
7. Executa la funció `setupNoesisCrm`.
8. Google et demanarà autorització. Accepta-la només si estàs dins el compte de Noesis.
9. Torna al Google Sheet i recarrega la pàgina.
10. Hauria d’aparèixer el menú `Noesis`.

## Afegir recerca d'empreses

La recerca automàtica funciona amb Google Places API. Aquesta API busca negocis a Google Maps/Places i importa nom, web, telèfon, adreça i enllaç de Maps. Normalment no dona emails; l'email s'ha d'afegir després amb recerca web o manual.

1. Crea o obre el projecte de Google Cloud del compte de Noesis.
2. Activa `Places API`.
3. Crea una API key.
4. Al Google Sheet, ves al full `Configuracio`.
5. Enganxa la clau a la fila `Google Places API Key`.
6. Torna al menú `Noesis`.
7. Prem `Preparar cerques` si encara no tens el full `Cerques`.
8. Al full `Cerques`, activa amb `Si` les files que vulguis buscar.
9. Prem `Noesis > Cercar empreses amb Places`.
10. Els leads nous apareixeran a `Leads_CRM` amb estat `Nou` i `Validat per enviar = No`.

Important: posa límits baixos al principi, per exemple 10 empreses per cerca. Primer volem qualitat i aprenentatge, no volum.

## Com treballar

1. Afegeix empreses al full `Leads_CRM`.
2. Completa sector, ciutat, web, email públic i notes de context.
3. Defineix `Sistema recomanat`.
4. Escriu o genera `Assumpte email` i `Email proposat`.
5. Quan tu decideixis que encaixa, marca `Validat per enviar` com `Si`.
6. Al menú `Noesis`, prem `Crear esborranys validats`.
7. Revisa cada esborrany a Gmail i envia manualment.

## Normes CEO

- No enviem correus massius sense criteri.
- No escrivim a contactes personals si tenim email corporatiu públic.
- No prometem resultats garantits.
- No parlem com una eina tècnica: parlem de processos, temps recuperat, ordre i impacte mesurable.
- Si un lead diu que no, es marca com `No interessat` o `Descartat` i no s’insisteix.

## Estats principals

- `Nou`: encara no s’ha investigat.
- `Enriquit`: ja tenim context i encaix probable.
- `Pendent validacio`: falta revisió humana.
- `Validat`: es pot preparar contacte.
- `Esborrany creat`: Gmail té el correu preparat.
- `Contactat`: ja s’ha enviat.
- `Interessat`: ha contestat positivament.
- `Reunio agendada`: hi ha trucada o reunió.
- `Seguiment futur`: no ara, però pot tenir sentit més endavant.
- `No interessat`: resposta negativa.
- `Client`: oportunitat convertida.

## Quan connectar API

No cal començar amb API de Google Places. Primer valida 50-100 leads manuals o semi-manuals. Quan vegem quin sector respon millor, connectem API per trobar més empreses similars amb criteri.
