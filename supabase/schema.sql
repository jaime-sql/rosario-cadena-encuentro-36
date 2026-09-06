-- =============================================================================
-- Rosario en Cadena por Encuentro 36 SJB
-- Pegue este archivo en: Supabase → SQL Editor → Run
-- (instalación nueva). Si la base ya existe, use supabase/parametros.sql
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
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_slot_start_uidx
  on bookings (slot_start);

-- Parámetros editables desde /organizador/ (misma PIN). Una sola fila.
create table if not exists parametros (
  id smallint primary key default 1 check (id = 1),
  evento_inicio timestamptz not null,
  evento_fin timestamptz not null,
  intervalo_minutos integer not null
    check (intervalo_minutos >= 1 and intervalo_minutos <= 180),
  max_reservas_por_telefono integer not null
    check (max_reservas_por_telefono >= 1 and max_reservas_por_telefono <= 20),
  corte_reagendar_minutos integer not null
    check (corte_reagendar_minutos >= 0 and corte_reagendar_minutos <= 10080),
  permitir_cancelar boolean not null default true,
  actualizado_en timestamptz not null default now(),
  constraint parametros_ventana_valida check (evento_fin > evento_inicio)
);

insert into parametros (
  id,
  evento_inicio,
  evento_fin,
  intervalo_minutos,
  max_reservas_por_telefono,
  corte_reagendar_minutos,
  permitir_cancelar
)
values (
  1,
  timestamptz '2026-09-12 06:00:00-06',
  timestamptz '2026-09-13 16:30:00-06',
  30,
  1,
  60,
  true
)
on conflict (id) do nothing;

create or replace function leer_parametros()
returns parametros
language plpgsql
stable
set search_path = public
as $$
declare
  fila parametros;
begin
  select * into fila from parametros where id = 1;
  if not found then
    raise exception 'Faltan los parámetros del Rosario';
  end if;
  return fila;
end;
$$;

revoke all on function leer_parametros() from public, anon, authenticated;

create or replace function validar_reserva()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  p parametros;
  tel text;
  ocupadas integer;
  epoch_diff bigint;
begin
  p := leer_parametros();

  tel := regexp_replace(coalesce(new.telefonos, ''), '\D', '', 'g');
  if tel !~ '^\d{8,15}$' then
    raise exception 'El teléfono debe tener solo dígitos (8 a 15)';
  end if;
  new.telefonos := tel;

  if new.slot_start < p.evento_inicio or new.slot_end > p.evento_fin then
    raise exception 'Turno fuera del horario del Rosario';
  end if;
  if new.slot_end <> new.slot_start + make_interval(mins => p.intervalo_minutos) then
    raise exception 'Cada turno debe durar exactamente % minutos', p.intervalo_minutos;
  end if;

  epoch_diff := extract(epoch from (new.slot_start - p.evento_inicio))::bigint;
  if mod(epoch_diff, (p.intervalo_minutos * 60)::bigint) <> 0 then
    raise exception 'El turno debe alinearse a intervalos de % minutos', p.intervalo_minutos;
  end if;

  if tg_op = 'INSERT' or new.telefonos is distinct from old.telefonos then
    select count(*) into ocupadas
    from bookings
    where telefonos = tel
      and id is distinct from new.id;
    if ocupadas >= p.max_reservas_por_telefono then
      raise exception 'Este teléfono ya tiene el máximo de reservas permitidas (%)', p.max_reservas_por_telefono;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function validar_reserva() from public, anon, authenticated;

drop trigger if exists bookings_validar_turno on bookings;
drop trigger if exists bookings_validar_reserva on bookings;
create trigger bookings_validar_reserva
before insert or update on bookings
for each row execute function validar_reserva();

alter table configuracion enable row level security;
alter table bookings enable row level security;
alter table parametros enable row level security;

-- El público puede INSCRIBIRSE (insert). No puede SELECT directo de telefonos.
drop policy if exists bookings_insert_publico on bookings;
create policy bookings_insert_publico
  on bookings
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists parametros_select_publico on parametros;
create policy parametros_select_publico
  on parametros
  for select
  to anon, authenticated
  using (true);

-- Vista pública: mismas columnas de la hoja, SIN teléfonos.
-- security_invoker = false: la vista corre como dueño y no choca con RLS.
create or replace view bookings_public
with (security_invoker = false) as
select slot_start, slot_end, esposos_responsables, numero_encuentro
from bookings;

grant select on bookings_public to anon, authenticated;
grant insert on bookings to anon, authenticated;
grant select on parametros to anon, authenticated;
-- no hay GRANT SELECT on bookings → telefonos no salen por REST público
-- no hay GRANT UPDATE/DELETE on bookings → reagendar/cancelar solo por RPC

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

create or replace function reservas_por_telefono(p_telefonos text)
returns table (
  slot_start timestamptz,
  slot_end timestamptz,
  esposos_responsables text,
  numero_encuentro integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  tel text := regexp_replace(coalesce(p_telefonos, ''), '\D', '', 'g');
begin
  if tel !~ '^\d{8,15}$' then
    raise exception 'Indique un teléfono válido (solo dígitos)';
  end if;
  return query
    select
      b.slot_start,
      b.slot_end,
      b.esposos_responsables,
      b.numero_encuentro
    from bookings b
    where b.telefonos = tel
    order by b.slot_start;
end;
$$;

revoke all on function reservas_por_telefono(text) from public;
grant execute on function reservas_por_telefono(text) to anon, authenticated;

create or replace function reagendar_reserva(
  p_telefonos text,
  p_slot_actual timestamptz,
  p_nuevo_inicio timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tel text := regexp_replace(coalesce(p_telefonos, ''), '\D', '', 'g');
  rec bookings;
  p parametros;
  nuevo_fin timestamptz;
begin
  p := leer_parametros();

  select * into rec
  from bookings
  where slot_start = p_slot_actual
  for update;

  if not found then
    raise exception 'No se encontró esa reserva';
  end if;
  if rec.telefonos <> tel then
    raise exception 'El teléfono no coincide con esta reserva';
  end if;
  if now() > rec.slot_start - make_interval(mins => p.corte_reagendar_minutos) then
    raise exception 'Ya no se puede reagendar este turno (el corte es % minutos antes del inicio)', p.corte_reagendar_minutos;
  end if;

  nuevo_fin := p_nuevo_inicio + make_interval(mins => p.intervalo_minutos);

  update bookings
  set slot_start = p_nuevo_inicio,
      slot_end = nuevo_fin
  where id = rec.id;
exception
  when unique_violation then
    raise exception 'Este turno ya fue reservado';
end;
$$;

revoke all on function reagendar_reserva(text, timestamptz, timestamptz) from public;
grant execute on function reagendar_reserva(text, timestamptz, timestamptz) to anon, authenticated;

create or replace function cancelar_reserva(
  p_telefonos text,
  p_slot_inicio timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tel text := regexp_replace(coalesce(p_telefonos, ''), '\D', '', 'g');
  rec bookings;
  p parametros;
begin
  p := leer_parametros();
  if not p.permitir_cancelar then
    raise exception 'Las cancelaciones no están permitidas';
  end if;

  select * into rec
  from bookings
  where slot_start = p_slot_inicio
  for update;

  if not found then
    raise exception 'No se encontró esa reserva';
  end if;
  if rec.telefonos <> tel then
    raise exception 'El teléfono no coincide con esta reserva';
  end if;
  if now() > rec.slot_start - make_interval(mins => p.corte_reagendar_minutos) then
    raise exception 'Ya no se puede cancelar este turno (el corte es % minutos antes del inicio)', p.corte_reagendar_minutos;
  end if;

  delete from bookings where id = rec.id;
end;
$$;

revoke all on function cancelar_reserva(text, timestamptz) from public;
grant execute on function cancelar_reserva(text, timestamptz) to anon, authenticated;

create or replace function actualizar_parametros(
  pin text,
  p_evento_inicio timestamptz,
  p_evento_fin timestamptz,
  p_intervalo_minutos integer,
  p_max_reservas_por_telefono integer,
  p_corte_reagendar_minutos integer,
  p_permitir_cancelar boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  duracion_segundos bigint;
begin
  if not es_organizador(pin) then
    raise exception 'PIN inválido';
  end if;
  if p_evento_fin <= p_evento_inicio then
    raise exception 'El fin del Rosario debe ser posterior al inicio';
  end if;
  if p_intervalo_minutos < 1 or p_intervalo_minutos > 180 then
    raise exception 'El intervalo debe estar entre 1 y 180 minutos';
  end if;
  if p_max_reservas_por_telefono < 1 or p_max_reservas_por_telefono > 20 then
    raise exception 'El máximo por teléfono debe estar entre 1 y 20';
  end if;
  if p_corte_reagendar_minutos < 0 or p_corte_reagendar_minutos > 10080 then
    raise exception 'El corte debe estar entre 0 y 10080 minutos';
  end if;

  duracion_segundos := extract(epoch from (p_evento_fin - p_evento_inicio))::bigint;
  if mod(duracion_segundos, (p_intervalo_minutos * 60)::bigint) <> 0 then
    raise exception 'La ventana del Rosario debe ser múltiplo del intervalo de los turnos';
  end if;

  -- No se borran reservas al cambiar el horario o el intervalo.
  update parametros
  set
    evento_inicio = p_evento_inicio,
    evento_fin = p_evento_fin,
    intervalo_minutos = p_intervalo_minutos,
    max_reservas_por_telefono = p_max_reservas_por_telefono,
    corte_reagendar_minutos = p_corte_reagendar_minutos,
    permitir_cancelar = p_permitir_cancelar,
    actualizado_en = now()
  where id = 1;

  if not found then
    insert into parametros (
      id,
      evento_inicio,
      evento_fin,
      intervalo_minutos,
      max_reservas_por_telefono,
      corte_reagendar_minutos,
      permitir_cancelar
    ) values (
      1,
      p_evento_inicio,
      p_evento_fin,
      p_intervalo_minutos,
      p_max_reservas_por_telefono,
      p_corte_reagendar_minutos,
      p_permitir_cancelar
    );
  end if;
end;
$$;

revoke all on function actualizar_parametros(text, timestamptz, timestamptz, integer, integer, integer, boolean) from public;
grant execute on function actualizar_parametros(text, timestamptz, timestamptz, integer, integer, integer, boolean) to anon, authenticated;

create or replace function cambiar_pin(pin_actual text, pin_nuevo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  nuevo text := trim(coalesce(pin_nuevo, ''));
begin
  if not es_organizador(pin_actual) then
    raise exception 'PIN inválido';
  end if;
  if char_length(nuevo) < 4 or char_length(nuevo) > 40 then
    raise exception 'El nuevo PIN debe tener entre 4 y 40 caracteres';
  end if;
  update configuracion
  set valor = nuevo
  where clave = 'org_pin';
end;
$$;

revoke all on function cambiar_pin(text, text) from public;
grant execute on function cambiar_pin(text, text) to anon, authenticated;
