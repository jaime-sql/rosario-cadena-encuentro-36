# Rosario en Cadena por Encuentro 36 SJB

Aplicación web en español para inscribir turnos del Rosario en Cadena de la Parroquia San Juan Bautista (MEC-SJB, El Salvador).

- Valores por defecto: **sábado 12 de septiembre 2026, 06:00** → **domingo 13 de septiembre 2026, 16:30** (`America/El_Salvador`), turnos de **30 minutos**
- Esos datos (y el resto de reglas) se editan en `/organizador/` → **Parámetros**, sin SQL
- Columnas: Hora inicio · Hora finalización · Esposos responsables · No. encuentro · Teléfonos
- La lista pública **nunca muestra teléfonos**
- Coordinación en `/organizador/` (PIN) con tabla completa (teléfono editable en la grilla), **exportación CSV** y parámetros
- El frontend es **estático**. Las reservas viven en **Supabase** (Postgres, plan Free)
- Hay **dos pipelines**: GitHub Pages es **DEV**; Cloudflare Pages + Worker es **PROD**

**Repositorio:** [github.com/jaime-sql/rosario-cadena-encuentro-36](https://github.com/jaime-sql/rosario-cadena-encuentro-36)

**DEV (GitHub Pages):** [https://jaime-sql.github.io/rosario-cadena-encuentro-36/](https://jaime-sql.github.io/rosario-cadena-encuentro-36/)

**PROD (Cloudflare):** [https://mecsjb.org/rosariocadena](https://mecsjb.org/rosariocadena) (`/rosariocadena` y `/rosariocadena/*`). El apex `mecsjb.org` queda libre para otro sitio.

---

## Cómo correrlo en local

Requiere Node.js 20 o 22.

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Abra [http://127.0.0.1:43127](http://127.0.0.1:43127) si arranca con `npm run dev` (puerto 43127). El comando por defecto de Next.js también funciona: `npx next dev`.

Sin claves de Supabase, la app entra en **modo local**: las reservas se guardan solo en este navegador (`localStorage`). Sirve para probar la UI; **no comparte inscripciones entre personas**. El aviso aparece en pantalla.

PIN de prueba en modo local: `sjb36` (o el valor de `ORG_PIN`).

---

## Variables de entorno

| Variable | Dónde | Qué es |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | `.env.local` y secreto de GitHub Actions | URL del proyecto, p. ej. `https://xxxx.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | igual | Clave **anon** (pública) de Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_URL` | opcional | Mismo valor; Next.js necesita el prefijo `NEXT_PUBLIC_` en el bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | opcional | Igual que la clave anon |
| `ORG_PIN` | **Supabase** (tabla `configuracion`) y, solo en local, `.env.local` | PIN de `/organizador/`. **No** lo ponga en un secreto `NEXT_PUBLIC_` de Pages ni de Cloudflare: quedaría visible en el JavaScript |
| `BASE_PATH` | Lo inyectan los pipelines | Prefijo de rutas y assets. Dev: `/rosario-cadena-encuentro-36`. Prod: `/rosariocadena`. En local se deja vacío |
| `CLOUDFLARE_API_TOKEN` | Secreto de GitHub Actions | Solo para el flujo de **promoción a prod**. No se usa en el sitio publicado |

La clave anon **sí** es pública: está pensada para el navegador. La seguridad de los teléfonos la dan las políticas RLS y la función `organizer_bookings(pin)`, no el ocultar la anon key.

Si las variables siguen con el texto `YOUR_PROJECT` / `YOUR_SUPABASE_ANON_KEY`, la app las ignora y usa modo local.

---

## Crear la base en Supabase (plan Free)

1. Cree un proyecto en [https://supabase.com](https://supabase.com) (región cercana; cualquier región sirve).
2. Abra **SQL Editor** y pegue todo el archivo [`supabase/schema.sql`](supabase/schema.sql). Ejecute **Run**.
3. Si la base **ya existía** (solo `bookings` + `configuracion`), pegue en su lugar [`supabase/parametros.sql`](supabase/parametros.sql). No borra reservas. Si ya tenía parámetros y solo falta editar teléfonos desde Coordinación, pegue [`supabase/telefono-organizador.sql`](supabase/telefono-organizador.sql).
4. El PIN se puede cambiar desde `/organizador/` → Parámetros. También puede hacerlo por SQL:

```sql
update configuracion
set valor = 'SU_PIN_SECRETO'
where clave = 'org_pin';
```

5. En **Project Settings → API** copie:
   - Project URL → `PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `PUBLIC_SUPABASE_ANON_KEY`
6. Péguelas en `.env.local` (local) y en GitHub → **Settings → Secrets and variables → Actions**.

### Tabla `parametros` (una sola fila)

| Columna | Valor por defecto | Qué controla |
| --- | --- | --- |
| `evento_inicio` / `evento_fin` | 12 sep 2026 06:00 → 13 sep 2026 16:30 (−06) | Ventana del Rosario en `America/El_Salvador` |
| `intervalo_minutos` | 30 | Duración de cada turno. La ventana debe ser múltiplo de este valor |
| `max_reservas_por_telefono` | 1 | Reservas activas por teléfono (dígitos normalizados) |
| `corte_reagendar_minutos` | 60 | Minutos de anticipación para **reagendar o cancelar** (`now() ≤ inicio − corte`) |
| `permitir_cancelar` | true | Si es `false`, nadie puede cancelar desde la web |

El público **puede leer** esta tabla (no hay secretos). Solo el organizador la escribe, con el PIN, mediante `actualizar_parametros`. Cambiar inicio, fin o intervalo **no borra reservas**; la UI avisa si ya hay inscripciones.

### Tabla `bookings`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `slot_start` | `timestamptz` | **Único** (índice `bookings_slot_start_uidx`). Impide dos reservas en el mismo turno |
| `slot_end` | `timestamptz` | Debe ser `slot_start + intervalo_minutos` (según `parametros`) |
| `esposos_responsables` | `text` | Obligatorio |
| `numero_encuentro` | `integer` | Obligatorio, > 0 |
| `telefonos` | `text` | Solo dígitos (8–15); se normaliza al guardar. No se expone en la vista pública |
| `created_at` | `timestamptz` | Se llena solo |

Los turnos **no** se pre-insertan. La UI los genera en el cliente a partir de `parametros`; la base solo guarda inscripciones.

### RLS (quién ve qué)

- `bookings`: el rol `anon` **puede insertar**, **no puede hacer SELECT** ni UPDATE/DELETE. Así `telefonos` no sale por REST.
- Vista `bookings_public`: solo `slot_start`, `slot_end`, `esposos_responsables`, `numero_encuentro`.
- `configuracion`: RLS activo y **sin políticas** → el PIN no se lee desde el cliente.
- `parametros`: SELECT público; escritura solo por RPC con PIN.
- RPC `organizer_bookings(pin)`: `SECURITY DEFINER`; si el PIN coincide con `configuracion.org_pin`, devuelve todas las columnas (incluido `telefonos`) para la tabla de coordinación y el CSV.
- RPC `actualizar_telefono_organizador(pin, p_slot_inicio, p_telefonos)`: mismo PIN; actualiza solo `bookings.telefonos`. El trigger `validar_reserva` exige 8–15 dígitos y el máximo por teléfono. **Hay que aplicarlo en el proyecto de Supabase en vivo** (`telefono-organizador.sql` o un `schema.sql` nuevo).
- RPC `actualizar_parametros(pin, …)` / `cambiar_pin(pin_actual, pin_nuevo)`: mismo PIN.
- RPC `reservas_por_telefono`, `reagendar_reserva`, `cancelar_reserva`: el visitante demuestra que es dueño con el teléfono. Reagendar mueve la fila (el turno anterior queda libre; el único en `slot_start` se mantiene). Cancelar solo si `permitir_cancelar` y dentro del **mismo corte**.

Un segundo `INSERT` con el mismo `slot_start` falla con error Postgres `23505`. La UI lo muestra como *«Este turno ya fue reservado»*.

---

## Dos pipelines: DEV (GitHub Pages) y PROD (Cloudflare)

Un solo código. El `basePath` / `assetPrefix` lo decide `BASE_PATH` en `next.config.ts`.

| | DEV | PROD |
| --- | --- | --- |
| Dónde | GitHub Pages | Cloudflare Pages + Worker de ruta |
| URL | `https://jaime-sql.github.io/rosario-cadena-encuentro-36/` | `https://mecsjb.org/rosariocadena` |
| `BASE_PATH` | `/rosario-cadena-encuentro-36` | `/rosariocadena` |
| Cuándo se publica | Automático al hacer push a `main` | Manual: **Actions → Cloudflare Prod → Run workflow**, o un tag `prod-*` |
| Flujo | [`.github/workflows/pages.yml`](.github/workflows/pages.yml) | [`.github/workflows/cloudflare-prod.yml`](.github/workflows/cloudflare-prod.yml) |

El Worker `rosariocadena-path` solo atiende `mecsjb.org/rosariocadena` y `mecsjb.org/rosariocadena/*`. No reclama el resto del apex. En DNS hay registros originless proxificados en el apex (`192.0.2.1` / `100::`) para que esas rutas pasen por Cloudflare; cuando exista el sitio del apex, se reemplazan por el origen real y el Worker sigue aplicando solo a `/rosariocadena*`.

Proyecto Pages (no crear otro): `rosario-cadena` (`rosario-cadena.pages.dev`). El mismo proyecto de Supabase (`kwbhytabavegnqfeidjw`) se reutiliza; las claves van en el proyecto Pages (producción) y en los secretos de Actions. **El PIN del organizador no se toca** (sigue en `configuracion.org_pin`).

### Cómo promover a producción

1. Confirme que DEV en GitHub Pages se ve bien.
2. En el repo: **Settings → Secrets and variables → Actions** debe existir `CLOUDFLARE_API_TOKEN` (permisos de Pages Edit + Workers Edit en la cuenta de Jaime). `PUBLIC_SUPABASE_*` ya se usan para DEV.
3. **Actions → Cloudflare Prod → Run workflow**. Eso construye con `BASE_PATH=/rosariocadena`, sube `out/` al proyecto `rosario-cadena` y redespliega el Worker de ruta.
4. También sirve un tag `prod-*` (`git tag prod-2026-09-12 && git push origin prod-2026-09-12`).

No conecte un deploy automático de Cloudflare a `main` si quiere que `main` siga siendo solo DEV. El repo puede quedar enlazado al proyecto Pages para disparar deploys desde el panel; la promoción prevista es el workflow manual.

### Activar GitHub Pages (DEV)

1. Suba este repo a `main`: [jaime-sql/rosario-cadena-encuentro-36](https://github.com/jaime-sql/rosario-cadena-encuentro-36).
2. Cree los secretos de Actions: `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.
3. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. El flujo [`.github/workflows/pages.yml`](.github/workflows/pages.yml) construye el sitio estático (`output: "export"`) y lo publica.
5. URL esperada: `https://jaime-sql.github.io/rosario-cadena-encuentro-36/`

Sin esos secretos el sitio igual se publica, pero cada visitante verá el **modo local** (reservas que no se comparten). Para el Rosario real, las claves de Supabase son obligatorias.

La primera publicación a veces pide aprobar el entorno `github-pages` (Settings → Environments).

---

## Coordinación

- Ruta: `/organizador/`
- Pedirá el **ORG_PIN** (el de la tabla `configuracion`, no un usuario).
- Ahí sí aparecen teléfonos y el botón **Exportar CSV** (columnas de la hoja + día). En **Reservas**, el organizador puede hacer clic en un teléfono, editarlo y guardar (Enter, al salir del campo, o el visto). Las demás columnas siguen solo de lectura.
- Pestaña **Parámetros**: inicio/fin, intervalo, máximo por teléfono, corte de reagendado/cancelación, permitir cancelar, y **cambiar PIN**.

En la página pública, **Gestionar mi reserva** pide el teléfono (solo dígitos) para reagendar o cancelar. Esa pantalla no lista teléfonos de otras personas.

---

## Pruebas

```bash
npm test
```

Cubre: generación de los 69 turnos, teléfono solo dígitos, máximo por teléfono, reagendar permitido/bloqueado por el corte, flag de cancelar, edición de teléfono por el organizador (válido / inválido conserva el anterior), y que la lista pública no incluye `telefonos`.

---

## Stack

- Next.js (exportación estática) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + RLS + RPC)
- Vitest

No hay pagos, cuentas de usuario ni WhatsApp.
