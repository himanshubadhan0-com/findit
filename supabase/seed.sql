-- =====================================================================
-- seed.sql: demo data for presentations
--
-- Creates 6 demo accounts (password for all: findit123) and 20 items.
--   demo1@example.com … demo5@example.com   (Demo User 1–5)
--   admin@example.com                       (Demo Admin, is_admin = true)
--
-- Several Lost/Found pairs are deliberately similar (same category,
-- overlapping words, same place, close dates) so smart matching has
-- something to find during the demo.
--
-- Safe to re-run: demo users are upserted and their items are replaced.
-- Dates are relative to today, so the data always looks fresh.
-- ⚠ Demo passwords are public. Delete these accounts before real use.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Demo auth users (the profiles trigger creates their profile rows)
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('findit123', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('name', u.name, 'phone', u.phone),
  now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'demo1@example.com', 'Demo User 1', '9000000001'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'demo2@example.com', 'Demo User 2', '9000000002'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'demo3@example.com', 'Demo User 3', null),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'demo4@example.com', 'Demo User 4', '9000000004'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'demo5@example.com', 'Demo User 5', null),
  ('a0000000-0000-4000-8000-0000000000ad'::uuid, 'admin@example.com', 'Demo Admin',  '9000000099')
) as u(id, email, name, phone)
on conflict (id) do nothing;

-- Email/password logins also need an identity row.
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@example.com'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

update public.profiles set is_admin = true where id = 'a0000000-0000-4000-8000-0000000000ad';

-- ---------------------------------------------------------------------
-- 2. Items (replace any previous demo items)
-- ---------------------------------------------------------------------
delete from public.items where user_id in (select id from auth.users where email like '%@example.com');

insert into public.items
  (id, user_id, type, title, description, category, location, date, verification_question, verification_answer, status)
values
  -- Phones (a matching pair: lost #1 ↔ found #2)
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'lost',
   'Black Samsung Galaxy phone', 'Black Samsung Galaxy S23 with a cracked corner and a clear back cover. Lost near the reading hall.',
   'Phone', 'Library', current_date - 2, null, null, 'open'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'found',
   'Samsung phone with clear cover', 'Found a black Samsung phone on a table on the first floor of the library. Screen corner is cracked.',
   'Phone', 'Library', current_date - 1, 'What is the lock screen wallpaper?', 'A mountain sunset', 'open'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'lost',
   'Blue iPhone 13', 'Blue iPhone 13 in a red silicone case. Probably left on a bench at the ground after football practice.',
   'Phone', 'Ground', current_date - 6, null, null, 'open'),

  -- Wallets (pair: lost #4 ↔ found #5)
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'lost',
   'Brown leather wallet', 'Brown leather wallet with my college ID, a metro card and some cash. Lost during lunch.',
   'Wallet', 'Canteen', current_date - 3, null, null, 'open'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', 'found',
   'Leather wallet near canteen counter', 'Found a brown wallet near the canteen billing counter. Has some cards inside.',
   'Wallet', 'Canteen', current_date - 3, 'Which metro card is inside, and what colour is it?', 'Blue metro card', 'open'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'lost',
   'Black zip wallet', 'Small black zip wallet, no cash, just my debit card and library card.',
   'Wallet', 'Parking', current_date - 10, null, null, 'open'),

  -- ID cards
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'found',
   'Student ID card, Computer Science', 'Found a student ID card with a blue lanyard outside Room 204, Classroom Block.',
   'ID Card', 'Classroom Block', current_date - 1, 'What name is printed on the lanyard?', 'Tech Fest 2025', 'open'),
  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000003', 'lost',
   'ID card with blue lanyard', 'Lost my student ID on a blue Tech Fest lanyard somewhere in the classroom block.',
   'ID Card', 'Classroom Block', current_date - 2, null, null, 'open'),

  -- Keys (pair: lost #9 ↔ found #10)
  ('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000005', 'lost',
   'Hostel room keys with red keychain', 'Two keys on a red bottle-opener keychain. Room keys for Hostel B.',
   'Keys', 'Hostel', current_date - 4, null, null, 'open'),
  ('b0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000004', 'found',
   'Keys with red keychain', 'Found a bunch of two keys with a red keychain in the hostel common room.',
   'Keys', 'Hostel', current_date - 3, 'What shape or type is the keychain?', 'Bottle opener', 'open'),
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000002', 'lost',
   'Honda bike key', 'Honda Activa key with a small black tag. Lost in the parking lot.',
   'Keys', 'Parking', current_date - 1, null, null, 'open'),

  -- Bags
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000003', 'found',
   'Grey backpack with laptop sleeve', 'Grey Wildcraft backpack left on the bleachers at the ground. Has notebooks inside.',
   'Bag', 'Ground', current_date - 2, 'What is written on the first page of the notebook inside?', 'Physics notes', 'open'),
  ('b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000004', 'lost',
   'Black tote bag', 'Black canvas tote bag with a sunflower print. Had my sketchbook in it.',
   'Bag', 'Canteen', current_date - 8, null, null, 'open'),

  -- Laptop / accessories
  ('b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'lost',
   'White laptop charger', 'Dell 65W laptop charger with a white cable, left plugged in at the library charging desk.',
   'Laptop/Accessories', 'Library', current_date - 5, null, null, 'open'),
  ('b0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000005', 'found',
   'Wireless earbuds case', 'Found a white wireless earbuds case (no earbuds) in the lecture hall.',
   'Laptop/Accessories', 'Classroom Block', current_date - 2, 'What brand are the earbuds?', 'boAt', 'open'),

  -- Books
  ('b0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000002', 'lost',
   'Engineering Mathematics textbook', 'B.S. Grewal Higher Engineering Mathematics, my name written inside the cover. Lost in the library.',
   'Books', 'Library', current_date - 7, null, null, 'open'),
  ('b0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000004', 'found',
   'Data Structures notebook', 'Spiral notebook with Data Structures notes found on a canteen table.',
   'Books', 'Canteen', current_date - 4, null, null, 'open'),

  -- Other
  ('b0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000003', 'lost',
   'Steel water bottle', 'Silver Milton steel water bottle with stickers. Lost at the ground.',
   'Other', 'Ground', current_date - 3, null, null, 'open'),

  -- Already resolved items (so the admin stats have something to show)
  ('b0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000005', 'found',
   'Black umbrella', 'Black foldable umbrella found at the parking entrance.',
   'Other', 'Parking', current_date - 14, null, null, 'returned'),
  ('b0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000001', 'found',
   'Casio scientific calculator', 'Casio fx-991EX calculator found after the exam in the classroom block.',
   'Other', 'Classroom Block', current_date - 12, 'What is scratched on the back?', 'Initials AK', 'returned');

-- Approved claims for the returned items, so the history is consistent.
insert into public.claims (item_id, claimer_id, answer_given, status) values
  ('b0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000002', null, 'approved'),
  ('b0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000003', 'AK initials', 'approved')
on conflict (item_id, claimer_id) do nothing;

-- The claims above fired "new claim" notifications through the trigger.
-- Clear them so every demo starts with an empty notifications list.
delete from public.notifications where user_id in (select id from auth.users where email like '%@example.com');
