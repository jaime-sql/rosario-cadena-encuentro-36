-- =============================================================================
-- Teléfono editable por el organizador (incremental)
-- Pegue este archivo en: Supabase → SQL Editor → Run
--
-- Destinado a una base que YA tiene supabase/schema.sql.
-- NO borra reservas. Es idempotente (se puede volver a ejecutar).
--
-- No hay GRANT UPDATE on bookings: el público no puede cambiar teléfonos.
-- El organizador usa este RPC con el mismo PIN de Coordinación.
-- validar_reserva sigue exigiendo 8–15 dígitos y el máximo por teléfono.
-- =============================================================================

create or replace function actualizar_telefono_organizador(
  pin text,
  p_slot_inicio timestamptz,
  p_telefonos text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  rec bookings;
  guardado text;
begin
  if not es_organizador(pin) then
    raise exception 'PIN inválido';
  end if;

  select * into rec
  from bookings
  where slot_start = p_slot_inicio
  for update;

  if not found then
    raise exception 'No se encontró esa reserva';
  end if;

  update bookings
  set telefonos = p_telefonos
  where id = rec.id
  returning telefonos into guardado;

  return guardado;
end;
$$;

revoke all on function actualizar_telefono_organizador(text, timestamptz, text) from public;
grant execute on function actualizar_telefono_organizador(text, timestamptz, text) to anon, authenticated;
