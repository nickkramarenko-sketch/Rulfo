-- Cold email database (Supabase / Postgres)

create table if not exists companies (
  id            bigserial primary key,
  name          text not null,
  domain        text unique,
  customer_type text,            -- importer, ca_manufacturer, retail_brand, amazon_brand, distributor, forwarder, broker, drayage, project
  list_code     text,            -- A..I
  city          text,
  state         text,
  employees     int,
  source        text,            -- apollo, apify, importyeti, manual
  fit_score     int,             -- 0-100, see ideal-customer-profile.md
  status        text default 'new',  -- new, in_campaign, replied, customer, do_not_contact
  notes         text,
  created_at    timestamptz default now()
);

create table if not exists contacts (
  id                   bigserial primary key,
  company_id           bigint references companies(id) on delete cascade,
  first_name           text,
  last_name            text,
  title                text,
  email                text unique not null,
  email_status         text,     -- ok, catch_all, invalid (only ok gets emailed)
  personalization_line text,
  created_at           timestamptz default now()
);

create table if not exists campaigns (
  id                    bigserial primary key,
  name                  text not null,
  list_code             text,
  instantly_campaign_id text,
  variant               text,    -- A or B
  launched_at           timestamptz,
  status                text default 'draft'  -- draft, active, paused, done
);

create table if not exists enrollments (
  contact_id  bigint references contacts(id) on delete cascade,
  campaign_id bigint references campaigns(id) on delete cascade,
  added_at    timestamptz default now(),
  last_step   int default 0,
  primary key (contact_id, campaign_id)
);

create table if not exists replies (
  id          bigserial primary key,
  contact_id  bigint references contacts(id),
  campaign_id bigint references campaigns(id),
  received_at timestamptz,
  category    text,              -- interested, not_now, wrong_person, no, bounce, ooo
  body        text,
  handled     boolean default false
);

create table if not exists suppression (
  value      text primary key,   -- email or domain
  reason     text,               -- opt_out, bounce, customer, competitor
  added_at   timestamptz default now()
);
