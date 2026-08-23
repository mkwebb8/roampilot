create index if not exists household_invitations_accepted_by_idx
  on public.household_invitations (accepted_by);

create index if not exists household_invitations_invited_by_idx
  on public.household_invitations (invited_by);

create index if not exists household_memberships_invited_by_idx
  on public.household_memberships (invited_by);
