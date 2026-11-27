import { useCallback, useEffect, useState } from "react";
import { api, tok } from "./api";

type A = any;
const TL = (n: number) => "₺" + Math.round(n).toLocaleString("tr-TR");
const STEPS = ["Yüklendi", "Yolda", "Kod Bekleniyor", "Teslim Edildi"];
const ACTS = ["seal", "arrive", "deliver"];
const BTN = ["Akıllı Mührü Okut", "Teslimat Noktasına Geldim", "Teslimi Onayla"];
const VT = ["Kamyonet (Panelvan)", "Kamyonet (Açık Kasa)", "Kamyon (10 Teker)", "Tır (13.60 Dorse)", "Frigorifik"];
const EV = { type: VT[0], plate: "", w: "", l: "", h: "", kg: "" };

const Logo = () => <b className="logo">GÖLGE<span>FİLO</span></b>;
const Fit = ({ ok }: { ok: boolean }) => <span className={"badge " + (ok ? "b-ok" : "b-dg")}>{ok ? "✓ KASA KAPISINA UYUMLU" : "✕ SIĞMIYOR"}</span>;
const Stepper = ({ s }: { s: number }) => (
  <div className="row top">{STEPS.map((x, i) => <div key={x} className={"step " + (s >= i ? "on" : "")}><i>{s > i ? "✓" : i + 1}</i>{x}</div>)}</div>
);
const Empty = ({ t }: { t: string }) => <div className="mu c pad">{t}</div>;

function Auth({ onIn }: { onIn: () => void }) {
  const [up, setUp] = useState(false), [role, setRole] = useState("driver"), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const go = async (path: string, body: object) => {
    setBusy(true); setErr("");
    try { tok.set((await api(path, "POST", body)).token); onIn(); } catch (e: A) { setErr(e.message); }
    setBusy(false);
  };
  const set = (k: string) => (e: A) => setF({ ...f, [k]: e.target.value });
  const demo = (email: string) => go("/auth/login", { email, password: "demo123" });
  return (
    <div className="scr">
      <Logo />
      {[["business", "İşletme / Sevkiyatçı", "Yük gönder, boş dönüş araçlarıyla tasarruf et"], ["driver", "Tır & Ticari Araç Şoförü", "Boş dönüş rotanı paraya çevir, anında yük bul"]].map(([k, t, s]) => (
        <div key={k} className={"role " + (role === k ? "on" : "")} onClick={() => setRole(k)}><b>{t}</b><div className="mu">{s}</div></div>
      ))}
      <div className="tabsw">{[false, true].map(u => <div key={String(u)} className={up === u ? "on" : ""} onClick={() => setUp(u)}>{u ? "Üye Ol" : "Giriş Yap"}</div>)}</div>
      {up && <><label>Ad Soyad</label><input value={f.name} onChange={set("name")} /></>}
      <label>E-posta</label><input type="email" value={f.email} onChange={set("email")} />
      <label>Şifre (en az 6 karakter)</label><input type="password" value={f.password} onChange={set("password")} />
      {err && <div className="badge b-dg block">{err}</div>}
      <button className="btn" disabled={busy} onClick={() => go(up ? "/auth/register" : "/auth/login", up ? { ...f, role } : f)}>{up ? "Kaydı Tamamla" : "Giriş Yap"}</button>
      <div className="mu c">Hızlı deneme</div>
      <div className="row"><button className="btn s" onClick={() => demo("demo@isletme.com")}>Demo İşletme</button><button className="btn s" onClick={() => demo("demo@sofor.com")}>Demo Şoför</button></div>
    </div>
  );
}

const VN: A = { tir: "Tır (13.60 Dorse)", kam: "Kamyon (10 Teker)", kmt: "Kamyonet (Panelvan)" };
const MapView = ({ pins = [], trucks = [], route = false, done = false, h = 220, pick }: A) => (<>
  <svg width="100%" height={h} viewBox={`0 0 300 ${h}`} preserveAspectRatio="none" style={{ borderRadius: 18, background: "#09111f", border: "1px solid var(--bd)", display: "block" }}>
    <defs><pattern id="g" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#12203a" /></pattern></defs>
    <rect width="300" height={h} fill="url(#g)" />
    <path d={`M0 ${h * .6}Q80 ${h * .4} 150 ${h * .55}T300 ${h * .35}`} stroke="#0e2a4a" strokeWidth="16" fill="none" />
    {route && <><path d={`M45 ${h * .3}Q120 ${h * .55} 170 ${h * .45}T255 ${h * .72}`} stroke="#38BDF8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="45" cy={h * .3} r="7" fill="#2563EB" stroke="#fff" strokeWidth="2" /><circle cx="255" cy={h * .72} r="7" fill={done ? "#10B981" : "#F97316"} stroke="#fff" strokeWidth="2" /></>}
    {pins.map((l: A) => <g key={l.id} style={{ cursor: "pointer" }} onClick={() => pick?.(l)}><circle cx={l.x * 3} cy={l.y * h / 100} r="15" fill="rgba(56,189,248,.18)" />
      <circle cx={l.x * 3} cy={l.y * h / 100} r="8" fill={l.fit ? "#10B981" : "#EF4444"} stroke="#fff" strokeWidth="2" /></g>)}
    {trucks.map(([x, y]: number[], i: number) => <circle key={i} cx={x * 3} cy={y * h / 100} r="6" fill="#38BDF8" stroke="#fff" strokeWidth="1.5" />)}
  </svg>
  <div className="row">{[["Google Haritalar’da Aç", "https://www.google.com/maps/dir/?api=1&origin=Tuzla,Istanbul&destination=Sincan,Ankara&travelmode=driving"],
    ["Apple Haritalar’da Aç", "https://maps.apple.com/?saddr=Tuzla,Istanbul&daddr=Sincan,Ankara&dirflg=d"]].map(([t, u]) => <a key={t} className="btn s" href={u} target="_blank" rel="noreferrer">{t}</a>)}</div></>);

function Sim() {
  const [s, setS] = useState<A>({ v: "tir", pw: 120, pl: 120, n: 8 }), [r, setR] = useState<A>(null);
  useEffect(() => { api("/simulate", "POST", s).then(setR).catch(() => setR(null)); }, [s]);
  const set = (k: string) => (e: A) => setS({ ...s, [k]: k === "v" ? e.target.value : Math.max(1, Math.min(k === "n" ? 36 : 600, +e.target.value || 1)) });
  const cols = r ? Math.max(1, Math.floor(r.L / s.pl)) : 1, k = r ? 290 / r.L : 0;
  return <>
    <h2>Araç Uyumluluk Simülasyonu</h2>
    <label>Araç</label><select value={s.v} onChange={set("v")}>{Object.keys(VN).map(x => <option key={x} value={x}>{VN[x]}</option>)}</select>
    <div className="row">{[["n", "Palet adedi"], ["pw", "Yük eni (cm)"], ["pl", "Yük boyu (cm)"]].map(([x, t]) => <div key={x} style={{ flex: 1 }}><label>{t}</label><input type="number" value={s[x]} onChange={set(x)} /></div>)}</div>
    {r && <>
      <div className="card c" style={{ borderColor: r.fit ? "var(--ok)" : "var(--dg)" }}><Fit ok={r.fit} /><div className="mu">{s.pw}×{s.pl} cm yük | Kapı: {r.W}×{r.H} cm</div></div>
      <svg width="100%" viewBox={`0 0 300 ${r.W * k + 10}`}><rect x="5" y="5" width={r.L * k} height={r.W * k} fill="none" stroke="#38BDF8" />
        {Array.from({ length: Math.min(s.n, r.per) }, (_, i) => <rect key={i} x={5 + (i % cols) * s.pl * k} y={5 + Math.floor(i / cols) * s.pw * k} width={s.pl * k - 1} height={s.pw * k - 1} fill={r.fit ? "#10B981" : "#EF4444"} />)}</svg>
      <div className="num c" style={{ color: "var(--cy)" }}>%{r.fill} Dolu</div></>}
  </>;
}

const Sh = ({ close, children }: A) => <div className="sheet" onClick={close}><div onClick={e => e.stopPropagation()}>{children}</div></div>;
const shrink = (f: File) => new Promise<string>(res => {
  const im = new Image();
  im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = im.width * k; c.height = im.height * k; c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.6)); };
  im.src = URL.createObjectURL(f);
});

export default function App() {
  const [me, setMe] = useState<A>(null), [d, setD] = useState<A>({ loads: [], offers: [], fleet: [], notes: [] });
  const [tab, setTab] = useState(0), [ft, setFt] = useState("Bekleyen"), [msg, setMsg] = useState(""), [bell, setBell] = useState(false);
  const [of, setOf] = useState<A>(null), [code, setCode] = useState(""), [vf, setVf] = useState<A>(EV);
  const [mo, setMo] = useState(false), [sim, setSim] = useState(false), [gear, setGear] = useState(false), [cv, setCv] = useState(100000), [pre, setPre] = useState<number[]>([]);
  const [plansO, setPlansO] = useState(false), [retO, setRetO] = useState(false), [sub, setSub] = useState(3), [qr, setQr] = useState(0), [photo, setPhoto] = useState(""), [ev, setEv] = useState<A>(null);
  const [rf, setRf] = useState<A>({ cap: "Tam Kasa", ilce: "Ankara (Sincan)", cik: "1 Saat İçinde" }), [tf, setTf] = useState<A>({ c: "", t: "", p: "", d: "" });
  const toast = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 2600); };

  const refresh = useCallback(async () => {
    try {
      const [m, offers, fleet, notes, loads, radar, molas, esg, plans, tpls] = await Promise.all([api("/me"), api("/offers"), api("/fleet"), api("/notifications"), api("/loads"), api("/radar"), api("/molas"), api("/esg"), api("/plans"), api("/templates")]);
      setMe(m); setD({ offers, fleet, notes, loads, radar, molas, esg, plans, tpls });
    } catch { if (!tok.get()) setMe(null); }
  }, []);
  useEffect(() => { if (tok.get()) refresh(); }, [refresh]);
  useEffect(() => { if (!me) return; const t = setInterval(refresh, 5000); return () => clearInterval(t); }, [me?.id, refresh]);
  const run = async (fn: () => Promise<unknown>, ok = "") => {
    try { await fn(); if (ok) toast(ok); await refresh(); } catch (e: A) { toast(e.message); }
  };

  if (!me) return <div id="app"><Auth onIn={refresh} /></div>;
  const biz = me.role === "business", O: A[] = d.offers;
  const act = O.find(o => o.status === "Kabul Edilen"), pend = O.filter(o => o.status === "Bekleyen");
  const T = biz ? ["Panel", "Teklifler", "Takip", "Araçlarım", "Şablonlar"] : ["Yükler", "Tekliflerim", "Taşıma", "Cüzdan"];
  const sv = (k: string) => (e: A) => setVf({ ...vf, [k]: e.target.value });
  let v: A = null;

  if (!biz && tab === 0) v = <><h1>Uygun Yükler</h1>{d.loads.map((l: A) => (
    <div className="card" key={l.id}>
      <div className="row sp"><b>{l.origin} → {l.dest}</b><b className="num ok">{TL(l.price)}</b></div>
      <div className="mu">{l.company} • {l.km} km • {l.weight} • {l.pallet}</div>
      <div className="row sp"><Fit ok={!!l.fit} /><button className="btn s w" disabled={!l.fit} onClick={() => setOf({ load: l, price: l.price })}>Teklif Ver</button></div>
    </div>))}</>;

  if (!biz && tab === 1) { const L = O.filter(o => o.status === ft); v = <><h1>Tekliflerim</h1>
    <div className="chips">{["Bekleyen", "Kabul Edilen", "Geçmiş"].map(x => <div key={x} className={"chip " + (ft === x ? "on" : "")} onClick={() => setFt(x)}>{x}</div>)}</div>
    {L.length ? L.map(o => <div className="card" key={o.id}>
      <div className="row sp"><b>{o.origin} → {o.dest}</b><span className="num">{TL(o.price)}</span></div><div className="mu">{o.company} • {o.weight}</div>
      {o.status === "Kabul Edilen" && <button className="btn" onClick={() => setTab(2)}>Aktif Taşımaya Geç</button>}</div>) : <Empty t="Bu sekmede teklif yok. Yükler ekranından teklif ver." />}</>; }

  if (!biz && tab === 2) v = act ? <><h1>Aktif Taşıma</h1><Stepper s={act.step} />
    <div className="card"><b>{act.company}</b><div className="mu">{act.origin} → {act.dest} • {act.weight}</div>
      <div className="mu">🔒 {TL(act.price)} güvencede; teslimde cüzdanına aktarılır</div></div>
    {act.step === 2 && <><label className="btn s" style={photo ? { borderColor: "var(--ok)", color: "var(--ok)" } : {}}>{photo ? "✓ Fotoğraf alındı" : "Teslimat Fotoğrafı Çek"}<input type="file" accept="image/*" capture="environment" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) setPhoto(await shrink(f)); }} /></label><input className="code" maxLength={4} inputMode="numeric" placeholder="••••" value={code} onChange={e => setCode(e.target.value)} /></>}
    <button className="btn" onClick={() => { run(() => api(`/offers/${act.id}/step`, "POST", { action: ACTS[act.step], code, photo }), "Taşıma güncellendi"); setCode(""); setPhoto(""); }}>{BTN[act.step]}</button><button className="btn s" onClick={() => setQr(act.id)}>Dijital İrsaliye QR</button></>
    : <Empty t="Aktif taşıma yok. Kabul edilen teklifin burada görünür." />;

  if (!biz && tab === 3) v = <><h1>Kasa &amp; Cüzdan</h1><div className="card grad"><div className="mu">GölgeCüzdan</div><div className="num" style={{ fontSize: 30 }}>{TL(me.balance)}</div></div>
    {d.fleet[0] && <div className="card"><b>Kasa Profili</b><div className="row sp"><span className="mu">İç ölçü (E×B×Y)</span><b>{d.fleet[0].w} × {d.fleet[0].l} × {d.fleet[0].h} cm</b></div><div className="row sp"><span className="mu">Plaka</span><b>{d.fleet[0].plate}</b></div></div>}</>;

  if (biz && tab === 0) v = <><h1>İşletme Paneli</h1><div className="card grad"><div className="mu">Şirket Bakiyesi</div><div className="num" style={{ fontSize: 30 }}>{TL(me.balance)}</div></div>
    <button className="btn" onClick={() => run(() => api("/wallet/topup", "POST", { amount: 10000 }), "₺10.000 bakiye yüklendi")}>Bakiye Yükle (+₺10.000)</button>
    <div className="card row sp"><span>Bekleyen teklif</span><b className="num">{pend.length}</b></div>
    <div className="card row sp"><span>Yoldaki taşıma</span><b className="num">{O.filter(o => o.status === "Kabul Edilen").length}</b></div></>;

  if (biz && tab === 1) v = <><h1>Gelen Teklifler</h1>{pend.length ? pend.map(o => <div className="card" key={o.id}>
    <div className="row sp"><b>{o.driver} • {o.weight}</b><b className="num">{TL(o.price)}</b></div><div className="mu">{o.origin} → {o.dest} • {o.pallet}</div>
    <div className="row sp"><Fit ok={!!o.fit} /><button className="btn s w" disabled={!o.fit} onClick={() => run(() => api(`/offers/${o.id}/accept`, "POST"), "Teklif onaylandı • Tutar escrow'a kilitlendi")}>Onayla &amp; Escrow</button></div></div>)
    : <Empty t="Bekleyen teklif yok. Yeni teklifler burada görünür." />}</>;

  if (biz && tab === 2) { const L = O.filter(o => o.status !== "Bekleyen"); v = <><h1>Canlı Takip</h1>{L.length ? L.map(o => <div className="card" key={o.id}>
    <div className="row sp"><b>{o.origin} → {o.dest}</b><span className={"badge " + (o.step === 3 ? "b-ok" : "b-wn")}>{STEPS[o.step]}</span></div><div className="mu" style={{ margin: "6px 0 12px" }}>{o.driver} • {o.weight}</div>
    <Stepper s={o.step} /><div className="row sp"><span className="mu">Teslimat onay kodu</span><b className="num" style={{ fontSize: 22, letterSpacing: 6 }}>{o.code}</b></div>
    <div className="mu" style={{ marginTop: 8 }}>{o.step === 3 ? `✓ ${TL(o.price * 0.94)} şoföre aktarıldı` : `🔒 ${TL(o.price)} escrow'da`}</div></div>) : <Empty t="Takip edilecek taşıma yok. Önce bir teklifi onayla." />}</>; }

  if (biz && tab === 3) v = <><h1>Araçlarım</h1><div className="card"><h2>Yeni Araç Ekle</h2>
    <label>Araç Tipi</label><select value={vf.type} onChange={sv("type")}>{VT.map(x => <option key={x}>{x}</option>)}</select>
    <label>Plaka</label><input placeholder="34 ABC 123" value={vf.plate} onChange={sv("plate")} />
    <div className="row">{[["w", "En (cm)"], ["l", "Boy (cm)"], ["h", "Yükseklik"]].map(([k, t]) => <div key={k} style={{ flex: 1 }}><label>{t}</label><input type="number" value={vf[k]} onChange={sv(k)} /></div>)}</div>
    <label>Azami Kapasite (kg)</label><input type="number" value={vf.kg} onChange={sv("kg")} />
    <button className="btn" onClick={() => run(async () => { await api("/fleet", "POST", { type: vf.type, plate: vf.plate, w: +vf.w, l: +vf.l, h: +vf.h, kg: +vf.kg }); setVf(EV); }, "Araç eklendi")}>Aracı Kaydet</button></div>
    {d.fleet.map((x: A) => <div className="card" key={x.id}><div className="row sp"><b>{x.type}</b><span className="mu">{x.plate}</span></div>
      <div className="mu">{x.w} × {x.l} × {x.h} cm • {x.kg.toLocaleString("tr-TR")} kg</div>
      <button className="btn s" style={{ color: "var(--dg)" }} onClick={() => run(() => api(`/fleet/${x.id}`, "DELETE"), "Araç kaldırıldı")}>Aracı Kaldır</button></div>)}</>;

  const exportData = async () => {
    const j = await api("/export"), a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(j, null, 2)], { type: "application/json" })); a.download = "golgefilo-verilerim.json"; a.click();
  };
  const lp = d.loads.map((l: A) => ({ ...l, x: [62, 48, 30][(l.id - 1) % 3], y: [62, 44, 70][(l.id - 1) % 3] }));
  const g0 = d.radar?.[0];
  const rad = (d.radar ?? []).map((g: A, i: number) => <div className="card" key={i}><div className="row sp"><b>{g.v}</b><span className="badge b-wn">{g.m} sonra</span></div>
    <div className="mu" style={{ margin: "4px 0" }}>{g.w} bölgesinde boşalacak • {g.d} • {g.c}</div>
    <button className={"btn " + (pre.includes(i) ? "" : "s")} disabled={pre.includes(i)} onClick={() => run(async () => { await api(`/radar/${i}/reserve`, "POST"); setPre([...pre, i]); }, "Ön rezervasyon gönderildi")}>{pre.includes(i) ? "✓ Ön rezervasyon gönderildi" : "Ön Rezervasyon Yap"}</button></div>);

  if (!biz && tab === 0) v = <>
    <MapView pins={mo ? [] : lp} trucks={mo ? [[30, 30], [70, 60], [50, 80], [22, 62]] : []} pick={(l: A) => l.fit && setOf({ load: l, price: l.price })} />
    <div className="card b-wn" style={{ fontSize: 12.5, marginTop: 12 }}><b>Yasaklı Saat &amp; Tonaj Kalkanı</b><br />Büyükşehir tır/kamyon yasağı: 06:00–10:00 ve 16:00–22:00. Köprü/tünel geçişinde 5 t üzeri uyarı aktif.</div>
    {g0 && <div className="card"><h2>Gelecek Boşluk Radarı</h2><b>{g0.m} sonra {g0.w} bölgesinde boşalacaksın → {g0.d}</b><div className="mu" style={{ marginTop: 6 }}>Rota ve teslimat hızına göre tahmin. 2 fabrikaya ön rezervasyon bildirimi gitti. Tahmini bekleme: 0 dk.</div></div>}
    <div className="chips">{["Uygun Yükler", "Mola & Esnaf Noktaları"].map(x => <div key={x} className={"chip " + ((x !== "Uygun Yükler") === mo ? "on" : "")} onClick={() => setMo(x !== "Uygun Yükler")}>{x}</div>)}</div>
    {mo ? <><h2>Rotan Üzerinde: Mola &amp; Konfor</h2>{(d.molas ?? []).map((m: A) => <div className="card row sp" key={m.n}><div><b>{m.n}</b><div className="mu">{m.t}</div></div><span className="badge b-ok">{m.km}</span></div>)}</> : v}</>;
  if (biz && tab === 0) v = <>{v}<h2>Canlı Filo Takibi</h2><MapView trucks={[[30, 35], [55, 50], [75, 70], [40, 75]]} /><h2 style={{ marginTop: 12 }}>Gelecek Boşluk Radarı</h2>{rad}</>;
  if (biz && tab === 1) v = <><button className="btn s" onClick={() => setSim(true)}>Araç Uyumluluk Simülasyonu</button>{v}
    <div className="card" style={{ borderColor: "var(--ok)" }}><h2>Kurumsal ESG &amp; Karbon (SKA 13)</h2><div className="num ok" style={{ fontSize: 28 }}>{(d.esg?.co2 ?? 0).toLocaleString("tr-TR")} kg CO₂</div><div className="mu">Boş dönüş kapasitesi kullanımıyla önlenen emisyon</div></div></>;
  if (biz && tab === 2) v = <><MapView route done={O.some(o => o.step === 3)} />{v}
    {O.filter(o => o.status === "Kabul Edilen").map(o => <div className="card" key={o.id}><h2>Anlık Mikro-Kargo Sigortası • {o.origin} → {o.dest}</h2>
      {o.ins_no ? <><span className="badge b-ok">✓ Poliçe aktif</span>{[["Poliçe No", o.ins_no], ["Teminat", TL(o.ins_cover)], ["Ödenen prim (%1,5)", TL(o.ins_prem)]].map(([a, b]) => <div className="row sp" key={a}><span className="mu">{a}</span><b className="num">{b}</b></div>)}</>
        : <><label>Yük değeri</label><select value={cv} onChange={e => setCv(+e.target.value)}>{[50000, 100000, 250000].map(x => <option key={x} value={x}>{TL(x)}</option>)}</select>
          <div className="row sp"><span className="mu">Prim (%1,5)</span><b className="num">{TL(cv * 0.015)}</b></div>
          <button className="btn" onClick={() => run(() => api(`/offers/${o.id}/insure`, "POST", { cover: cv }), "Sigorta poliçesi kesildi")}>Anlık Sigorta Kes</button></>}</div>)}</>;

  const r = me.ret ? JSON.parse(me.ret) : null, pl = (d.plans ?? []).find((x: A) => x.id === (me.plan ?? "pro"));
  const sav = pl ? Math.max(0, Math.round(sub * 2900 * 0.6 * (1 - pl.c / 100) - pl.p)) : 0;
  const seg = (k: string, a: string[]) => <div className="chips">{a.map(x => <div key={x} className={"chip " + (rf[k] === x ? "on" : "")} onClick={() => setRf({ ...rf, [k]: x })}>{x}</div>)}</div>;
  const tf_ = (k: string) => (e: A) => setTf({ ...tf, [k]: e.target.value });

  if (!biz && tab === 0) v = <><button className="btn" style={{ fontSize: 17, padding: 18 }} onClick={() => setRetO(true)}>🚚 Boşum, Dönüyorum</button>
    <div className="card row sp"><div><b>{r ? `${r.cap} • ${r.ilce}` : "Boş dönüş kapasitesi pasif"}</b><div className="mu">{r ? `Konum paylaşımı: ${me.privacy ?? "İlçe düzeyi"} (bulanık)` : "Güzergâh bildirerek yük eşleşmesini başlat"}</div></div>
      <button className="btn s w" style={{ color: "var(--dg)" }} onClick={() => run(() => api("/sos", "POST"), "SOS: Acil aktarma talebi operasyon ekibine iletildi")}>SOS</button></div>{v}</>;
  if (biz && tab === 0) v = <><button className="btn s" onClick={() => setPlansO(true)}>Üyelik Paketi: {pl?.n ?? "Pro Filo"} • Paketleri Gör</button>{v}</>;
  if (biz && tab === 2) v = <>{v}{O.filter(o => o.photo_t).map(o => <button className="btn s" key={o.id} onClick={() => run(async () => setEv(await api(`/offers/${o.id}/photo`)))}>Teslimat Kanıtını Gör • {o.origin} → {o.dest} • {o.photo_t}</button>)}</>;
  if (biz && tab === 4) v = <><h1>Şablonlar</h1>
    {(d.tpls ?? []).map((t: A, i: number) => <div className="card" key={i}><div className="row sp"><div><b>{t.c} • {t.t}</b><div className="mu">{t.d} • {t.co}</div></div><b className="num">{TL(t.p)}</b></div>
      <button className="btn s" onClick={() => run(() => api("/loads", "POST", { c: t.c, t: t.t, p: t.p }), "Yük ilanı açıldı • şoförlere gösteriliyor")}>Bu Şablonla Yük Aç</button></div>)}
    <div className="card"><h2>Yeni Şablon</h2><label>Varış şehri</label><input value={tf.c} onChange={tf_("c")} /><label>Yük türü</label><input placeholder="Palet (800 kg)" value={tf.t} onChange={tf_("t")} />
      <div className="row"><div style={{ flex: 1 }}><label>Fiyat (₺)</label><input type="number" value={tf.p} onChange={tf_("p")} /></div><div style={{ flex: 1 }}><label>Süre</label><input placeholder="2 sa" value={tf.d} onChange={tf_("d")} /></div></div>
      <button className="btn s" onClick={() => run(async () => { await api("/templates", "POST", { c: tf.c, t: tf.t, p: +tf.p, d: tf.d }); setTf({ c: "", t: "", p: "", d: "" }); }, "Şablon eklendi")}>+ Şablonu Kaydet</button></div>
    <div className="card"><h2>Paylaşımlı / Kısmi Kapasite</h2><p className="mu" style={{ marginBottom: 10 }}>Yarım dolu çıkan aracın kalan hacmini aynı güzergâhtaki işletmeye kirala ya da boş dönüş aracının kalan hacmini kirala.</p>
      <label className="row"><input type="checkbox" style={{ width: "auto", margin: 0 }} checked={!!me.share} onChange={e => run(() => api("/share", "PUT", { on: e.target.checked }))} /> Kalan kapasiteyi paylaşıma aç</label></div></>;

  return (
    <div id="app">
      <div className="row sp head"><Logo /><div className="row">
        <span className="badge b-ok">{biz ? "İşletme" : "Şoför"}</span><span className="bell" onClick={() => setGear(true)}>⚙</span>
        <span className="bell" onClick={() => setBell(true)}>🔔{d.notes.length > 0 && <b>{d.notes.length}</b>}</span>
        <span className="mu" onClick={() => { tok.set(null); setMe(null); setTab(0); }}>Çıkış</span></div></div>
      <div className="scr">{v}</div>
      <div className="tabs">{T.map((t, i) => <div key={t} className={"tab " + (tab === i ? "on" : "")} onClick={() => setTab(i)}>{t}</div>)}</div>
      {of && <div className="sheet" onClick={() => setOf(null)}><div onClick={e => e.stopPropagation()}>
        <h2>{of.load.origin} → {of.load.dest}</h2><div className="mu">Önerilen fiyat {TL(of.load.price)}</div>
        <div className="row" style={{ margin: "10px 0" }}>
          <button className="btn s w70" onClick={() => setOf({ ...of, price: Math.max(500, of.price - 250) })}>−250</button><div className="num big">{TL(of.price)}</div>
          <button className="btn s w70" onClick={() => setOf({ ...of, price: of.price + 250 })}>+250</button></div>
        <div className="row sp"><span className="mu">Net kazanç (%6 komisyon sonrası)</span><b className="num ok">{TL(of.price * 0.94)}</b></div>
        <button className="btn" onClick={() => { run(() => api("/offers", "POST", { load_id: of.load.id, price: of.price }), "Teklifiniz gönderildi"); setOf(null); setTab(1); setFt("Bekleyen"); }}>Teklifi Gönder</button></div></div>}
      {bell && <div className="sheet" onClick={() => setBell(false)}><div onClick={e => e.stopPropagation()}><h2>Bildirimler</h2>
        {d.notes.length ? d.notes.map((n: A, i: number) => <div className="card row sp" key={i}><span style={{ fontSize: 13 }}>{n.msg}</span><span className="mu">{n.ts}</span></div>) : <Empty t="Henüz bildirim yok." />}</div></div>}
      {sim && <div className="sheet" onClick={() => setSim(false)}><div onClick={e => e.stopPropagation()}><Sim /></div></div>}
      {gear && <div className="sheet" onClick={() => setGear(false)}><div onClick={e => e.stopPropagation()}><h2>Gizlilik Kontrol Merkezi</h2>
        <label>Konum paylaşım seviyesi</label>
        <select value={me.privacy ?? "İlçe düzeyi"} onChange={e => run(() => api("/privacy", "PUT", { level: e.target.value }), "Gizlilik ayarı kaydedildi")}>{["İlçe düzeyi", "Mahalle düzeyi", "Yalnızca teklif sonrası kesin konum"].map(x => <option key={x}>{x}</option>)}</select>
        <p className="mu" style={{ marginBottom: 10 }}>Kesin GPS yalnızca teklif kabul edilip ödeme güvenceye (escrow) alındıktan sonra açılır.</p>
        <button className="btn s" onClick={() => run(exportData, "Verileriniz indirildi")}>Verilerimi Dışa Aktar</button>
        <button className="btn s" style={{ color: "var(--dg)" }} onClick={() => window.confirm("Hesabınız ve verileriniz kalıcı olarak silinecek. Devam edilsin mi?") && run(async () => { await api("/me", "DELETE"); tok.set(null); setMe(null); setGear(false); })}>Hesabımı ve Verilerimi Sil (KVKK m.11)</button></div></div>}
      {plansO && <Sh close={() => setPlansO(false)}><h2>İşletme Üyelik Paketleri</h2><p className="mu">Bir boş dönüş sevkiyatı ortalama ₺1.800 – ₺4.500 navlun tasarrufu sağlar.</p>
        {(d.plans ?? []).map((x: A) => <div className={"role " + (me.plan === x.id ? "on" : "")} key={x.id} onClick={() => run(() => api("/plan", "PUT", { plan: x.id }), "Paket seçildi: " + x.n)}>
          <div className="row sp"><b>{x.n}</b>{x.pop && <span className="badge b-ok">En Popüler</span>}</div>
          <div className="num" style={{ fontSize: 22 }}>{TL(x.p)} <span className="mu">/ Ay</span></div><div className="mu" style={{ marginBottom: 6 }}>İşlem komisyonu %{x.c}</div>
          {x.f.map((t: string) => <div key={t} style={{ fontSize: 12.5, margin: "3px 0" }}><span className="ok">✓</span> {t}</div>)}</div>)}
        <div className="card" style={{ marginTop: 12 }}><h2>Tasarruf Hesaplayıcı</h2><div className="row sp mu"><span>Aylık sevkiyat sayısı</span><b className="num">{sub}</b></div>
          <input type="range" min="1" max="40" value={sub} onChange={e => setSub(+e.target.value)} style={{ padding: 0 }} /><div className="mu">Tahmini aylık net tasarruf</div><div className="num ok" style={{ fontSize: 26 }}>{TL(sav)}</div></div></Sh>}
      {retO && <Sh close={() => setRetO(false)}><h2>Boş Dönüş Bildirimi</h2><label>Kapasite</label>{seg("cap", ["Yarım Kasa", "Tam Kasa"])}
        <label>Gidiş Yönü / İlçe</label><select value={rf.ilce} onChange={e => setRf({ ...rf, ilce: e.target.value })}>{["Ankara (Sincan)", "İstanbul (Tuzla)", "İzmir (Bornova)"].map(x => <option key={x}>{x}</option>)}</select>
        <label>Tahmini Çıkış</label>{seg("cik", ["Hemen", "30 Dakika İçinde", "1 Saat İçinde"])}
        <button className="btn" onClick={() => { run(() => api("/return", "POST", rf), "Boş dönüş bildirildi • Yük eşleşmeleri aranıyor"); setRetO(false); }}>Dönüş Yükü Tekliflerini Al</button></Sh>}
      {qr > 0 && <Sh close={() => setQr(0)}><div className="c"><h2>Dijital e-İrsaliye QR</h2>
        <svg width="180" height="180" viewBox="0 0 110 110" style={{ background: "#fff", padding: 6, borderRadius: 12 }} fill="#000">{Array.from({ length: 121 }, (_, i) => { const x = i % 11, y = Math.floor(i / 11); return (x * 7 + y * 13 + x * y + qr) % 3 === 0 || (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7) ? <rect key={i} x={x * 10} y={y * 10} width="10" height="10" /> : null; })}</svg>
        <div className="mu" style={{ marginTop: 10 }}>İrsaliye No: GF-IRS-{qr} • Yol denetimi için gösterin</div></div></Sh>}
      {ev && <Sh close={() => setEv(null)}><h2>Teslimat Kanıtı • {ev.photo_t}</h2><img src={ev.photo} alt="Teslimat fotoğrafı" style={{ width: "100%", borderRadius: 14 }} /></Sh>}
      {msg && <div className="toast">{msg}</div>}
    </div>
  );
}
