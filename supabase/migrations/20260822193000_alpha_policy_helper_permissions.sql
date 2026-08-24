-- RLS policies execute these boolean helpers as the authenticated role.
-- They disclose no rows or identifiers and retain SECURITY DEFINER isolation.
grant execute on function private.is_alpha_admin(uuid) to authenticated;
grant execute on function private.has_alpha_access(uuid) to authenticated;

