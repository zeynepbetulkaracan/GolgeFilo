const BASE = import.meta.env.VITE_API ?? ""; // mobil build için: VITE_API=https://api.alanadiniz.com
export const tok = {
  get: () => localStorage.getItem("gf"),
  set: (t: string | null) => (t ? localStorage.setItem("gf", t) : localStorage.removeItem("gf")),
};

export async function api(path: string, method = "GET", body?: unknown): Promise<any> {
  const r = await fetch(BASE + "/api" + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + (tok.get() ?? "") },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== "/auth/login") tok.set(null);
  if (!r.ok) throw new Error(typeof j.detail === "string" ? j.detail : "Bilgileri kontrol edin (ad, geçerli e-posta, en az 6 karakterli şifre, pozitif ölçüler).");
  return j;
}
