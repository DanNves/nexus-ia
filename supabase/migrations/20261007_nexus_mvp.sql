-- NEXUS MVP — migration 2026-10-07
-- Esta migração complementa o schema Supabase já provisionado.
-- Não remove dados existentes.

begin;

-- O ticket precisa conseguir apontar diretamente para o requisito que
-- fundamentou o atendimento. A relação continua navegável também por
-- record_links.
alter table if exists public.tickets
  add column if not exists requirement_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tickets_requirement_id_fkey'
  ) then
    alter table public.tickets
      add constraint tickets_requirement_id_fkey
      foreign key (requirement_id)
      references public.requirements(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_tickets_requirement
  on public.tickets(requirement_id);

create index if not exists idx_tickets_activity
  on public.tickets(activity_id);

create index if not exists idx_requirements_demand_version
  on public.requirements(demand_id, version_id);

create index if not exists idx_knowledge_solution_version
  on public.knowledge(solution_id, version_id);

create index if not exists idx_audit_entity
  on public.audit_events(entity_type, entity_id);

commit;
