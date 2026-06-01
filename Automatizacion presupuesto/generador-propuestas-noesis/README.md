# Base comercial de agencia Noesis

Aplicación estática independiente basada en `../noesis_generador_propuestas.md`.

## Qué hace

- Registra oportunidades comerciales para empresas cliente.
- Recoge cliente, origen, estado, responsable interno, prioridad y diagnóstico.
- Define servicio recomendado, alcance, entregables, inversión y próxima acción.
- Genera una ficha interna de agencia y una propuesta/presupuesto con estructura Noesis.
- Construye un prompt detallado para pegar en Claude y redactar la propuesta final.
- Mantiene el estilo visual de Noesis sin mezclarse con la web principal.

## Flujo recomendado

1. Cargar una oportunidad nueva.
2. Completar diagnóstico y fricción principal.
3. Definir servicio, entregables y límites de alcance.
4. Generar la base de agencia.
5. Copiar el prompt en Claude para redactar la propuesta final.
6. Enviar presupuesto y actualizar el estado comercial.

## Cómo abrirla

Desde esta carpeta:

```bash
python3 -m http.server 8090
```

Luego abre:

```text
http://127.0.0.1:8090/
```

También se puede abrir `index.html` directamente en el navegador.
