-- Run after the store owner's first sign-in. Replace the UUID with that user's
-- Authentication → Users ID. Do not use an email as a role identifier.
insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'admin')
on conflict (user_id) do update set role = excluded.role;
