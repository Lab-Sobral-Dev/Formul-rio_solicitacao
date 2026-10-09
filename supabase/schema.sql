-- Execute no Supabase: SQL Editor > New query > colar tudo > Run
-- O script e idempotente: pode ser rodado de novo em bancos ja existentes.

-- ============================================================
-- 1. Tabelas
-- ============================================================
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
  request_date        date not null default current_date,
  current_time_value  text not null default '',
  requested_time      text not null default '',
  return_time         text not null default '',
  return_status       text not null default '',
  reason              text not null default '',
  control_id_time     text not null default '',
  created_at          timestamptz not null default now(),
  status              text not null default 'Pendente',
  decided_at          timestamptz
);

-- Migracoes para bancos criados em versoes anteriores.
alter table public.records add column if not exists status     text not null default 'Pendente';
alter table public.records add column if not exists decided_at timestamptz;
alter table public.records alter column request_date drop default;
alter table public.records alter column request_date type date
  using coalesce(nullif(request_date::text, '')::date, current_date);
alter table public.records alter column request_date set default current_date;

-- Uma unica solicitacao ativa por matricula, data e tipo de RQ (recusadas nao contam).
-- Se este comando falhar, ja existem duplicadas: recuse ou apague-as e rode de novo.
create unique index if not exists records_one_active_per_day
  on public.records (employee_id, request_date, request_type)
  where status <> 'Recusada';

-- ============================================================
-- 2. Funcoes auxiliares
-- ============================================================

-- Usuario do RH = usuario do Supabase Auth com app_metadata {"role": "rh"}.
-- app_metadata so pode ser alterado pelo painel/servidor, nunca pelo proprio usuario.
create or replace function public.is_rh()
returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'rh'
$$;

-- Permite ao formulario publico conferir UMA matricula sem listar a tabela.
create or replace function public.lookup_employee(p_employee_id text)
returns table (
  employee_id text,
  employee_name text,
  department text,
  role text,
  manager_name text,
  registered_schedule text
)
language sql stable security definer
set search_path = public
as $$
  select e.employee_id, e.employee_name, e.department, e.role, e.manager_name, e.registered_schedule
  from public.employees e
  where e.employee_id = p_employee_id
$$;

create or replace function public.employee_exists(p_employee_id text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.employees where employee_id = p_employee_id)
$$;

revoke all on function public.lookup_employee(text) from public;
revoke all on function public.employee_exists(text) from public;
grant execute on function public.lookup_employee(text) to anon, authenticated;
grant execute on function public.employee_exists(text) to anon, authenticated;

-- ============================================================
-- 3. Seguranca por linha (RLS)
-- ============================================================
alter table public.employees enable row level security;
alter table public.records   enable row level security;

-- Remove as politicas abertas da fase de teste.
drop policy if exists employees_all on public.employees;
drop policy if exists records_all   on public.records;

-- RH autenticado: acesso total.
drop policy if exists employees_rh on public.employees;
create policy employees_rh on public.employees
  for all to authenticated using (public.is_rh()) with check (public.is_rh());

drop policy if exists records_rh on public.records;
create policy records_rh on public.records
  for all to authenticated using (public.is_rh()) with check (public.is_rh());

-- Visitante (formulario publico): so INSERE solicitacoes novas e pendentes de
-- matriculas cadastradas. Nao le, nao altera e nao apaga nada.
drop policy if exists records_public_insert on public.records;
create policy records_public_insert on public.records
  for insert to anon
  with check (
    status = 'Pendente'
    and decided_at is null
    and public.employee_exists(employee_id)
  );

-- ============================================================
-- 4. Depois de rodar este script (passos no painel do Supabase)
-- ============================================================
-- a) Authentication > Sign In / Providers > desative "Allow new users to sign up".
-- b) Authentication > Users > Add user: informe e-mail e senha do RH (marque Auto Confirm).
-- c) Marque o usuario como RH (troque o e-mail) rodando:
--
--    update auth.users
--       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"rh"}'
--     where email = 'rh@suaempresa.com.br';
