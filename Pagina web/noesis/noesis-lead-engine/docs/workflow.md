# Workflow de captacio Noesis

## 1. Entrada de leads

Fonts possibles:

- Google Places / Maps
- Webs publiques
- Directoris locals
- Contactes personals
- Recomanacions de clients
- Llistats sectorials

El lead entra en estat `nou`.

## 2. Recerca i enriquiment

El Research Agent completa:

- sector
- ciutat
- web
- email public
- telefon
- descripcio del negoci
- senyals operatius visibles
- sistema Noesis recomanat
- benefici principal
- prioritat

No pot inventar dades. Si no troba una dada, deixa el camp buit.

## 3. Personalitzacio

El Personalization Agent crea:

- assumpte d'email
- email proposat
- seguiment proposat

To:

- huma
- directe
- respectuos
- poc agressiu
- orientat a ajuda i millora operativa

No usar paraules com "revolucionari", "garantit", "gratis per sempre" o promeses exagerades.

## 4. Validacio humana

Miquel o un soci revisa:

- si l'empresa encaixa
- si el missatge es correcte
- si el contacte es adequat
- si s'envia ara o mes endavant

Camp:

- `validat_per_enviar`: `si` o `no`

## 5. Enviament

Primera fase recomanada:

- crear esborrany
- revisar manualment
- enviar manualment

Quan el sistema funcioni:

- crear esborranys automaticament amb Gmail API
- mantenir revisio humana abans d'enviar

## 6. Classificacio de resposta

Respostes possibles:

- interessat
- demana mes informacio
- vol reunio
- ara no
- no interessat
- sense resposta

Segons resposta, canvia l'estat del lead.

## 7. Seguiment

Regles inicials:

- Sense resposta: seguiment suau al cap de 5-7 dies.
- Ara no: seguiment en 60-90 dies.
- Interessat: proposar trucada o reunio.
- No interessat: descartar i no insistir.

