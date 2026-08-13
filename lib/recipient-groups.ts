import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type RecipientEntry = { email: string; name: string };

export async function getAllTenantRecipients(nationsId: string): Promise<RecipientEntry[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("mejladress, namn")
    .eq("nations_id", nationsId)
    .not("mejladress", "is", null)
    .neq("mejladress", "")
    .order("fastighet", { ascending: true })
    .order("lagenhetsnummer", { ascending: true });
  if (error) throw error;
  return (data as { mejladress: string; namn: string | null }[]).map((d) => ({
    email: d.mejladress,
    name: d.namn ?? "",
  }));
}

export async function getTenantRecipientsByFastighet(
  nationsId: string,
  fastighet: string
): Promise<RecipientEntry[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("mejladress, namn")
    .eq("nations_id", nationsId)
    .eq("fastighet", fastighet)
    .not("mejladress", "is", null)
    .neq("mejladress", "")
    .order("lagenhetsnummer", { ascending: true });
  if (error) throw error;
  return (data as { mejladress: string; namn: string | null }[]).map((d) => ({
    email: d.mejladress,
    name: d.namn ?? "",
  }));
}

// Tenants with a signed contract moving in on the given date
export async function getInflyttningRecipients(
  nationsId: string,
  datum: string
): Promise<RecipientEntry[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .select("epost, hyresgast_namn")
    .eq("nations_id", nationsId)
    .eq("ledig_from", datum)
    .not("kontrakt_signerat_datum", "is", null)
    .not("epost", "is", null)
    .neq("epost", "");
  if (error) throw error;
  return (data as { epost: string; hyresgast_namn: string | null }[]).map((d) => ({
    email: d.epost,
    name: d.hyresgast_namn ?? "",
  }));
}

// Current tenants (from hyresgästlista) in apartments that become available on the given date
export async function getUtflyttningRecipients(
  nationsId: string,
  datum: string
): Promise<RecipientEntry[]> {
  const supabase = createSupabaseServerClient();
  const { data: apartments, error: apartmentsError } = await supabase
    .from("apartments")
    .select("lagenhetsnummer")
    .eq("nations_id", nationsId)
    .eq("ledig_from", datum);
  if (apartmentsError) throw apartmentsError;
  const lagenhetsnummers = (apartments as { lagenhetsnummer: string }[]).map((a) => a.lagenhetsnummer);
  if (lagenhetsnummers.length === 0) return [];

  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("mejladress, namn")
    .eq("nations_id", nationsId)
    .in("lagenhetsnummer", lagenhetsnummers)
    .not("mejladress", "is", null)
    .neq("mejladress", "");
  if (tenantsError) throw tenantsError;
  return (tenants as { mejladress: string; namn: string | null }[]).map((t) => ({
    email: t.mejladress,
    name: t.namn ?? "",
  }));
}
