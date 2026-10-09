-- Execute no Supabase: SQL Editor > New query > colar > Run

create table if not exists public.employees (
  employee_id         text primary key,
  employee_name       text not null default '',
  department          text not null default '',
  role                text not null default '',
  manager_name        text not null default '',
  registered_schedule text not null default ''
);

create table if not exists public.records (
  id                  text primary key,
  employee_name       text not null default '',
  employee_id         text not null default '',
  department          text not null default '',
  role                text not null default '',
  manager_name        text not null default '',
  registered_schedule text not null default '',
  request_type        text not null default '',
  request_date        text not null default '',
  current_time_value  text not null default '',
  requested_time      text not null default '',
  return_time         text not null default '',
  return_status       text not null default '',
  reason              text not null default '',
  control_id_time     text not null default '',
  created_at          timestamptz not null default now()
);

alter table public.employees enable row level security;
alter table public.records   enable row level security;

-- ATENCAO: politicas abertas para a chave anon (fase de teste).
-- Quem tiver a chave consegue ler e alterar. Antes de producao, trocar por
-- autenticacao real e politicas restritas.
drop policy if exists employees_all on public.employees;
create policy employees_all on public.employees for all to anon using (true) with check (true);

drop policy if exists records_all on public.records;
create policy records_all on public.records for all to anon using (true) with check (true);

-- Fluxo de aprovacao (etapa 1). Execute no SQL Editor; pode rodar mais de uma vez.
alter table public.records add column if not exists status     text not null default 'Pendente';
alter table public.records add column if not exists decided_at timestamptz;
