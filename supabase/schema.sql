-- =============================================================================
-- Rosario en Cadena por Encuentro 36 SJB
-- Pegue este archivo en: Supabase → SQL Editor → Run
-- =============================================================================

-- PIN de coordinación (cámbielo). La UI pública NUNCA lee esta tabla.
create table if not exists configuracion (
  clave text primary key,
  valor text not null
);

insert into configuracion (clave, valor)
values ('org_pin', 'sjb36')  -- ORG_PIN: cámbielo antes de publicar
on conflict (clave) do nothing;

-- Reservas: una fila por turno. slot_start es único → no hay doble reserva.
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  esposos_responsables text not null,
  numero_encuentro integer not null
    check (numero_encuentro > 0 and numero_encuentro <= 9999),
  telefonos text not null,
  created_at timestamptz not null default now(),
  constraint bookings_duracion_30min
    check (slot_end = slot_start + interval '30 minutes')
);

create unique index if not exists bookings_slot_start_uidx
  on bookings (slot_start);

create or replace function validar_turno_rosario()
returns trigger
language plpgsql
as $$
declare
  evento_inicio timestamptz := timestamptz '2026-09-12 06:00:00-06';
  evento_fin timestamptz := timestamptz '2026-09-13 16:30:00-06';
begin
  if new.slot_start < evento_inicio or new.slot_end > evento_fin then
    raise exception 'Turno fuera del horario del Rosario';
  end if;
  if mod(extract(epoch from (new.slot_start - evento_inicio))::integer, 1800) <> 0 then
    raise exception 'El turno debe alinearse a intervalos de 30 minutos';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_validar_turno on bookings;
create trigger bookings_validar_turno
before insert or update on bookings
for each row execute function validar_turno_rosario();

alter table configuracion enable row level security;
alter table bookings enable row level security;

-- El público puede INSCRIBIRSE (insert). No puede SELECT directo de telefonos.
drop policy if exists bookings_insert_publico on bookings;
create policy bookings_insert_publico
  on bookings
  for insert
  to anon, authenticated
  with check (true);

-- Vista pública: mismas columnas de la hoja, SIN teléfonos.
-- security_invoker = false: la vista corre como dueño y no choca con RLS.
create or replace view bookings_public
with (security_invoker = false) as
select slot_start, slot_end, esposos_responsables, numero_encuentro
from bookings;

grant select on bookings_public to anon, authenticated;
grant insert on bookings to anon, authenticated;
-- no hay GRANT SELECT on bookings → telefonos no salen por REST público

create or replace function es_organizador(pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from configuracion
    where clave = 'org_pin' and valor = pin
  );
$$;

revoke all on function es_organizador(text) from public;
grant execute on function es_organizador(text) to anon, authenticated;

-- Solo con ORG_PIN correcto se listan telefonos (para la tabla y el CSV).
create or replace function organizer_bookings(pin text)
returns table (
  slot_start timestamptz,
  slot_end timestamptz,
  esposos_responsables text,
  numero_encuentro integer,
  telefonos text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_organizador(pin) then
    raise exception 'PIN inválido';
  end if;
  return query
    select
      b.slot_start,
      b.slot_end,
      b.esposos_responsables,
      b.numero_encuentro,
      b.telefonos,
      b.created_at
    from bookings b
    order by b.slot_start;
end;
$$;

revoke all on function organizer_bookings(text) from public;
grant execute on function organizer_bookings(text) to anon, authenticated;
