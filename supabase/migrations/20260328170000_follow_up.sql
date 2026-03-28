alter table public.patients add column if not exists next_visit_date date;
alter table public.patients add column if not exists follow_up_months integer default 6;
