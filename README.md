# Rosario en Cadena por Encuentro 36 SJB

Aplicación web en español para inscribir **turnos de 30 minutos** del Rosario en Cadena de la Parroquia San Juan Bautista (MEC-SJB, El Salvador).

- **Sábado 12 de septiembre 2026, 06:00** → **domingo 13 de septiembre 2026, 16:30** (`America/El_Salvador`)
- Columnas: Hora inicio · Hora finalización · Esposos responsables · No. encuentro · Teléfonos
- La lista pública **nunca muestra teléfonos**
- Coordinación en `/organizador/` (PIN) con tabla completa y **exportación CSV**
- El frontend es **estático** (GitHub Pages). Las reservas viven en **Supabase** (Postgres, plan Free)

**Repositorio:** [github.com/jaime-sql/rosario-cadena-encuentro-36](https://github.com/jaime-sql/rosario-cadena-encuentro-36)

**Sitio (GitHub Pages):** [https://jaime-sql.github.io/rosario-cadena-encuentro-36/](https://jaime-sql.github.io/rosario-cadena-encuentro-36/)

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
| `ORG_PIN` | **Supabase** (tabla `configuracion`) y, solo en local, `.env.local` | PIN de `/organizador/`. **No** lo ponga en un secreto `NEXT_PUBLIC_` de Pages: quedaría visible en el JavaScript |

La clave anon **sí** es pública: está pensada para el navegador. La seguridad de los teléfonos la dan las políticas RLS y la función `organizer_bookings(pin)`, no el ocultar la anon key.

Si las variables siguen con el texto `YOUR_PROJECT` / `YOUR_SUPABASE_ANON_KEY`, la app las ignora y usa modo local.

---

## Crear la base en Supabase (plan Free)

1. Cree un proyecto en [https://supabase.com](https://supabase.com) (región cercana; cualquier región sirve).
2. Abra **SQL Editor** y pegue todo el archivo [`supabase/schema.sql`](supabase/schema.sql). Ejecute **Run**.
3. En esa misma SQL, cambie el PIN (reemplace `sjb36` por el suyo):

```sql
update configuracion
set valor = 'SU_PIN_SECRETO'
where clave = 'org_pin';
```

4. En **Project Settings → API** copie:
   - Project URL → `PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `PUBLIC_SUPABASE_ANON_KEY`
5. Péguelas en `.env.local` (local) y en GitHub → **Settings → Secrets and variables → Actions**.

### Tabla `bookings`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `slot_start` | `timestamptz` | **Único** (índice `bookings_slot_start_uidx`). Impide dos reservas en el mismo turno |
| `slot_end` | `timestamptz` | Debe ser `slot_start + 30 minutes` |
| `esposos_responsables` | `text` | Obligatorio |
| `numero_encuentro` | `integer` | Obligatorio, > 0 |
| `telefonos` | `text` | Obligatorio; no se expone en la vista pública |
| `created_at` | `timestamptz` | Se llena solo |

Los 69 turnos **no** se pre-insertan. La UI los genera en el cliente; la base solo guarda inscripciones.

### RLS (quién ve qué)

- `bookings`: el rol `anon` **puede insertar**, **no puede hacer SELECT**. Así `telefonos` no sale por REST.
- Vista `bookings_public`: solo `slot_start`, `slot_end`, `esposos_responsables`, `numero_encuentro`.
- `configuracion`: RLS activo y **sin políticas** → el PIN no se lee desde el cliente.
- RPC `organizer_bookings(pin)`: `SECURITY DEFINER`; si el PIN coincide con `configuracion.org_pin`, devuelve todas las columnas (incluido `telefonos`) para la tabla de coordinación y el CSV.

Un segundo `INSERT` con el mismo `slot_start` falla con error Postgres `23505`. La UI lo muestra como *«Este turno ya fue reservado»*.

---

## Activar GitHub Pages

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
- Ahí sí aparecen teléfonos y el botón **Exportar CSV** (columnas de la hoja + día).

---

## Pruebas

```bash
npm test
```

Cubre: generación de los 69 turnos, rechazo de doble reserva, validación de campos y que la lista pública no incluye `telefonos`.

---

## Stack

- Next.js (exportación estática) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + RLS + RPC)
- Vitest

No hay pagos, cuentas de usuario ni WhatsApp.
