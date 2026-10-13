REVOKE EXECUTE ON FUNCTION public.nf_guard_signup() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.nf_create_profile() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.nf_has_role(uuid, public.nf_papel) FROM anon;
GRANT EXECUTE ON FUNCTION public.nf_has_role(uuid, public.nf_papel) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nf_signup_open() TO anon, authenticated, service_role;