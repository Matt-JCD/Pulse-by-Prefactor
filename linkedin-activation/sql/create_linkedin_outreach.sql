create table if not exists linkedin_outreach (
  id uuid primary key default gen_random_uuid(),
  linkedin_profile_url text not null,
  public_identifier text,
  full_name text,
  first_name text,
  last_name text,
  headline text,
  company text,
  connection_since timestamptz,
  source text not null default 'phantombuster',
  first_seen_at timestamptz not null default now(),
  research jsonb not null default '{}'::jsonb,
  draft_message text,
  approved_message text,
  status text not null default 'detected',
  slack_message_ts text,
  slack_channel text,
  approved_at timestamptz,
  sent_at timestamptz,
  pb_connections_container_id text,
  pb_send_container_id text,
  send_result jsonb not null default '{}'::jsonb,
  last_error text,
  retry_count integer not null default 0,
  attio_person_record_id text,
  attio_company_record_id text,
  attio_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index on linkedin_outreach (linkedin_profile_url);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_linkedin_outreach_updated_at
  before update on linkedin_outreach
  for each row execute function update_updated_at_column();
