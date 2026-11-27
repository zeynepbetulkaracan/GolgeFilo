"""GölgeFilo API. Çalıştır: uvicorn main:app --reload"""
import base64, hashlib, hmac, json, os, re, secrets, sqlite3, time
from typing import Literal
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

SECRET = os.getenv("GF_SECRET", "degistir-beni").encode()
DB = os.getenv("GF_DB", "golgefilo.db")
TL = lambda n: "₺" + "{:,}".format(round(n)).replace(",", ".")
MAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

def q(sql, *a, one=False):
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    try:
        rows = [dict(r) for r in c.execute(sql, a).fetchall()]; c.commit()
    finally:
        c.close()
    return (rows[0] if rows else None) if one else rows

def hpw(pw, salt=None):
    salt = salt or secrets.token_hex(8)
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()

def note(uid, msg):
    if uid: q("insert into notes(user_id,msg,ts) values(?,?,?)", uid, msg, time.strftime("%H:%M"))

def mkuser(role, name, email, pw, bal=0):
    q("insert into users(role,name,email,pw,balance) values(?,?,?,?,?)", role, name, email.lower().strip(), hpw(pw), bal)
    return q("select * from users where email=?", email.lower().strip(), one=True)

def init():
    q("create table if not exists users(id integer primary key, role text, name text, email text unique, pw text, balance integer)")
    q("create table if not exists loads(id integer primary key, origin text, dest text, weight text, pallet text, km integer, price integer, fit integer, company text)")
    q("create table if not exists offers(id integer primary key, load_id integer, driver_id integer, biz_id integer, price integer, status text, step integer default 0, code text)")
    q("create table if not exists fleet(id integer primary key, owner_id integer, type text, plate text, w integer, l integer, h integer, kg integer)")
    q("create table if not exists notes(id integer primary key, user_id integer, msg text, ts text)")
    q("create table if not exists templates(id integer primary key, owner_id integer, c text, t text, p integer, d text, co text)")
    for t, c in (("offers", "ins_no text"), ("offers", "ins_cover integer"), ("offers", "ins_prem integer"), ("users", "privacy text default 'İlçe düzeyi'"), ("offers", "photo text"), ("offers", "photo_t text"), ("users", "plan text default 'pro'"), ("users", "welcome integer default 0"), ("users", "share integer default 0"), ("users", "ret text")):
        try: q(f"alter table {t} add column {c}")
        except sqlite3.OperationalError: pass
    if not q("select 1 from users limit 1"):
        mkuser("business", "Demo İşletme", "demo@isletme.com", "demo123", 128450)
        d = mkuser("driver", "Mehmet K.", "demo@sofor.com", "demo123", 18740)
        q("insert into fleet(owner_id,type,plate,w,l,h,kg) values(?,?,?,?,?,?,?)", d["id"], "Kamyonet (Panelvan)", "34 *** 1923", 200, 450, 190, 1500)
        for l in [("Tuzla", "Sincan", "1.200 kg", "120×120 cm Palet", 452, 4300, 1, "Beta Lojistik"),
                  ("Gebze", "Etimesgut", "5.800 kg", "Rulo 140×140 cm", 430, 12500, 1, "Yıldız Metal"),
                  ("Pendik", "Ostim", "900 kg", "Makine 280×150 cm", 440, 5200, 0, "Demir Makine")]:
            q("insert into loads(origin,dest,weight,pallet,km,price,fit,company) values(?,?,?,?,?,?,?,?)", *l)

def sign(uid):
    p = base64.urlsafe_b64encode(json.dumps({"u": uid, "e": time.time() + 7 * 86400}).encode()).decode()
    return p + "." + hmac.new(SECRET, p.encode(), hashlib.sha256).hexdigest()

def user(authorization: str = Header("")):
    try:
        p, s = authorization.removeprefix("Bearer ").split(".")
        if not hmac.compare_digest(s, hmac.new(SECRET, p.encode(), hashlib.sha256).hexdigest()): raise ValueError
        d = json.loads(base64.urlsafe_b64decode(p))
        u = q("select * from users where id=?", d["u"], one=True)
        if u and d["e"] > time.time(): return u
    except Exception:
        pass
    raise HTTPException(401, "Oturum süresi doldu, tekrar giriş yapın.")

def need(u, role):
    if u["role"] != role: raise HTTPException(403, "Bu işlem için yetkiniz yok.")

app = FastAPI(title="GölgeFilo API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
init()

class Reg(BaseModel):
    role: Literal["business", "driver"]; name: str = Field(min_length=2); email: str; password: str = Field(min_length=6)
class Login(BaseModel): email: str; password: str
class Off(BaseModel): load_id: int; price: int = Field(ge=500)
class Step(BaseModel): action: Literal["seal", "arrive", "deliver"]; code: str = ""; photo: str = ""
class Veh(BaseModel):
    type: str; plate: str = Field(min_length=5); w: int = Field(gt=0); l: int = Field(gt=0); h: int = Field(gt=0); kg: int = Field(gt=0)
class Top(BaseModel): amount: int = Field(gt=0, le=1_000_000)

@app.post("/api/auth/register")
def register(b: Reg):
    if not re.match(MAIL, b.email.strip()): raise HTTPException(422, "Geçerli bir e-posta girin.")
    if q("select 1 from users where email=?", b.email.lower().strip()): raise HTTPException(409, "Bu e-posta zaten kayıtlı.")
    return {"token": sign(mkuser(b.role, b.name, b.email, b.password)["id"])}

@app.post("/api/auth/login")
def login(b: Login):
    u = q("select * from users where email=?", b.email.lower().strip(), one=True)
    if not u or not hmac.compare_digest(u["pw"], hpw(b.password, u["pw"].split("$")[0])):
        raise HTTPException(401, "E-posta veya şifre hatalı.")
    return {"token": sign(u["id"])}

@app.get("/api/me")
def me(u=Depends(user)): return {k: u[k] for k in ("id", "role", "name", "email", "balance", "privacy", "plan", "share", "ret")}

@app.get("/api/loads")
def loads(u=Depends(user)): return q("select * from loads")

SEL = ("select o.id,o.status,o.step,o.price,o.code,o.ins_no,o.ins_cover,o.ins_prem,o.photo_t,l.origin,l.dest,l.weight,l.pallet,l.company,l.fit,x.name driver "
       "from offers o join loads l on l.id=o.load_id join users x on x.id=o.driver_id ")

@app.get("/api/offers")
def offers(u=Depends(user)):
    if u["role"] == "driver":
        rows = q(SEL + "where o.driver_id=? order by o.id desc", u["id"])
        for r in rows: r.pop("code")
        return rows
    return q(SEL + "where o.biz_id is null or o.biz_id=? order by o.id desc", u["id"])

@app.post("/api/offers")
def offer(b: Off, u=Depends(user)):
    need(u, "driver")
    l = q("select * from loads where id=?", b.load_id, one=True)
    if not l or not l["fit"]: raise HTTPException(400, "Bu yük aracınızın kasasına uygun değil.")
    q("insert into offers(load_id,driver_id,price,status) values(?,?,?,'Bekleyen')", b.load_id, u["id"], b.price)
    for z in q("select id from users where role='business'"):
        note(z["id"], f"Yeni teklif geldi: {TL(b.price)} • {l['origin']} → {l['dest']}")
    return {"ok": True}

@app.post("/api/offers/{oid}/accept")
def accept(oid: int, u=Depends(user)):
    need(u, "business")
    o = q("select * from offers where id=? and status='Bekleyen'", oid, one=True)
    if not o: raise HTTPException(404, "Teklif bulunamadı.")
    if u["balance"] < o["price"]: raise HTTPException(400, "Bakiye yetersiz. Önce bakiye yükleyin.")
    q("update users set balance=balance-? where id=?", o["price"], u["id"])
    q("update offers set status='Kabul Edilen', biz_id=?, code=? where id=?", u["id"], str(1000 + secrets.randbelow(9000)), oid)
    note(o["driver_id"], f"Teklifiniz kabul edildi: {TL(o['price'])}")
    return {"ok": True}

@app.post("/api/offers/{oid}/step")
def step(oid: int, b: Step, u=Depends(user)):
    need(u, "driver")
    o = q("select * from offers where id=? and driver_id=? and status='Kabul Edilen'", oid, u["id"], one=True)
    if not o: raise HTTPException(404, "Aktif taşıma bulunamadı.")
    if o["step"] != ["seal", "arrive", "deliver"].index(b.action): raise HTTPException(400, "Bu adım şu an yapılamaz.")
    if b.action == "deliver":
        if not b.photo.startswith("data:image/") or len(b.photo) > 500_000: raise HTTPException(400, "Önce teslimat fotoğrafını çekin.")
        if b.code != o["code"]: raise HTTPException(400, "Kod hatalı. Alıcıdan 4 haneli kodu tekrar isteyin.")
        pay = round(o["price"] * 0.94)
        q("update users set balance=balance+? where id=?", pay, u["id"])
        q("update offers set step=3, status='Geçmiş', photo=?, photo_t=? where id=?", b.photo, time.strftime("%H:%M:%S"), oid)
        note(o["biz_id"], "Teslimat tamamlandı, alıcı kodu onayladı. Ödeme şoföre aktarıldı.")
        note(u["id"], f"Ödeme {TL(pay)} cüzdanınıza aktarıldı")
    else:
        q("update offers set step=step+1 where id=?", oid)
        note(o["biz_id"], "Yük yüklendi, akıllı mühür okutuldu" if b.action == "seal" else "Şoför teslimat noktasına geldi, kod bekleniyor")
    return {"ok": True}

@app.get("/api/fleet")
def fleet(u=Depends(user)): return q("select * from fleet where owner_id=?", u["id"])

@app.post("/api/fleet")
def add_veh(b: Veh, u=Depends(user)):
    p = b.plate.replace(" ", ""); m = re.match(r"^(\d{2}).*?(\d{2,4})$", p)
    q("insert into fleet(owner_id,type,plate,w,l,h,kg) values(?,?,?,?,?,?,?)",
      u["id"], b.type, f"{m[1]} *** {m[2]}" if m else p, b.w, b.l, b.h, b.kg)
    return {"ok": True}

@app.delete("/api/fleet/{vid}")
def del_veh(vid: int, u=Depends(user)):
    q("delete from fleet where id=? and owner_id=?", vid, u["id"]); return {"ok": True}

@app.post("/api/wallet/topup")
def topup(b: Top, u=Depends(user)):
    q("update users set balance=balance+? where id=?", b.amount, u["id"]); return {"ok": True}

@app.get("/api/notifications")
def notifications(u=Depends(user)): return q("select msg,ts from notes where user_id=? order by id desc limit 30", u["id"])

VEH = {"tir": (1360, 245, 260), "kam": (750, 240, 250), "kmt": (450, 200, 190)}
GAPS = [("Kamyonet 34 *** 1923", "45 dk", "İkitelli OSB", "Tuzla yönü", "Yarım Kasa"),
        ("Kamyon 06 *** 4471", "1 sa 10 dk", "Gebze OSB", "Ankara yönü", "Tam Kasa"),
        ("Frigo 35 *** 2208", "1 sa 30 dk", "Tuzla Tersaneler", "İkitelli yönü", "Tam Kasa")]
MOLAS = [("Karayolları Esnaf Lokantası", "Geniş tır parkı • Menü ₺120 • Temiz tuvalet", "2,1 km"),
         ("Yıldız Lastik & Hava", "Lastik ve hava basma • 7/24", "3,4 km"),
         ("Dörtyol Çay Ocağı", "Anlaşmalı: 2. çay ücretsiz • Park alanı", "4,0 km"),
         ("Sahil Dinlenme Tesisi", "Duş ve tuvalet • Kamyonet parkı", "6,2 km")]

class Ins(BaseModel): cover: Literal[50000, 100000, 250000]
class Sim(BaseModel):
    v: Literal["tir", "kam", "kmt"]; pw: int = Field(gt=0); pl: int = Field(gt=0); n: int = Field(ge=1, le=36)
class Priv(BaseModel): level: Literal["İlçe düzeyi", "Mahalle düzeyi", "Yalnızca teklif sonrası kesin konum"]

@app.post("/api/offers/{oid}/insure")
def insure(oid: int, b: Ins, u=Depends(user)):
    need(u, "business")
    o = q("select * from offers where id=? and biz_id=? and status='Kabul Edilen' and ins_no is null", oid, u["id"], one=True)
    if not o: raise HTTPException(404, "Sigorta kesilecek aktif taşıma bulunamadı.")
    prem = round(b.cover * 0.015)
    if u["balance"] < prem: raise HTTPException(400, "Bakiye yetersiz. Önce bakiye yükleyin.")
    no = "GF-SGT-" + str(100000 + secrets.randbelow(900000))
    q("update users set balance=balance-? where id=?", prem, u["id"])
    q("update offers set ins_no=?, ins_cover=?, ins_prem=? where id=?", no, b.cover, prem, oid)
    note(u["id"], f"Sigorta poliçesi kesildi: {no} • prim {TL(prem)}")
    note(o["driver_id"], f"Bu taşıma için yük sigortası aktif ({TL(b.cover)} teminat)")
    return {"ok": True}

@app.post("/api/simulate")
def simulate(b: Sim, u=Depends(user)):
    L, W, H = VEH[b.v]
    per = (W // b.pw) * (L // b.pl); cap = max(per * 2, 1)
    return {"fit": b.pw <= W and b.pl <= W and b.pw <= H, "per": per, "fill": min(100, round(b.n / cap * 100)), "L": L, "W": W, "H": H}

@app.get("/api/radar")
def radar(u=Depends(user)): return [dict(zip("vmwdc", g)) for g in GAPS]

@app.post("/api/radar/{i}/reserve")
def reserve(i: int, u=Depends(user)):
    need(u, "business")
    if not 0 <= i < len(GAPS): raise HTTPException(404, "Kayıt bulunamadı.")
    g = GAPS[i]; note(u["id"], f"Ön rezervasyon gönderildi: {g[2]} → {g[3]}")
    for z in q("select id from users where role='driver'"): note(z["id"], f"Yeni ön rezervasyon talebi: {g[2]} çıkışlı yük")
    return {"ok": True}

@app.get("/api/molas")
def molas(u=Depends(user)): return [dict(zip(("n", "t", "km"), m)) for m in MOLAS]

@app.get("/api/esg")
def esg(u=Depends(user)):
    n = q("select count(*) c from offers where status='Geçmiş' and (biz_id=? or driver_id=?)", u["id"], u["id"], one=True)["c"]
    return {"co2": 412 + 18 * n, "n": n}

@app.put("/api/privacy")
def privacy(b: Priv, u=Depends(user)):
    q("update users set privacy=? where id=?", b.level, u["id"]); return {"ok": True}

@app.get("/api/export")
def export(u=Depends(user)):
    return {"profil": me(u), "teklifler": offers(u), "araclar": fleet(u), "bildirimler": notifications(u)}

@app.delete("/api/me")
def del_me(u=Depends(user)):
    for t, c in (("notes", "user_id"), ("fleet", "owner_id")): q(f"delete from {t} where {c}=?", u["id"])
    q("delete from offers where driver_id=? or biz_id=?", u["id"], u["id"]); q("delete from users where id=?", u["id"])
    return {"ok": True}

PLANS = [
 {"id": "bas", "n": "Başlangıç", "p": 0, "c": 12, "f": ["Ayda en fazla 3 aktif yük ilanı", "Standart GPS canlı takip", "Temel kasa/kapı uyum kontrolü"]},
 {"id": "pro", "n": "Pro Filo", "p": 1490, "c": 6, "pop": 1, "f": ["Sınırsız hızlı yük ve şablon", "Öncelikli boş dönüş radarı", "Paylaşımlı / kısmi kapasite", "Mikro-kargo sigortası indirimi", "Aylık kurumsal ESG raporu"]},
 {"id": "kur", "n": "Kurumsal Lojistik", "p": 4290, "c": 3, "f": ["₺2.500 hoş geldin bakiye kredisi", "Çoklu şube ve alt kullanıcı", "API / ERP ve e-İrsaliye entegrasyonu", "7/24 öncelikli operasyon temsilcisi", "SKA 9 ve SKA 13 ESG sertifikası"]}]
TPL = [("İstanbul", "Palet (1.200 kg)", 4300, "90 dk", "18 kg CO₂"), ("Ankara", "Rulo (5.800 kg)", 12500, "4 sa 45 dk", "42 kg CO₂"), ("İzmir", "Koli (640 kg)", 3900, "3 sa 10 dk", "27 kg CO₂")]

class Pl(BaseModel): plan: Literal["bas", "pro", "kur"]
class Sh(BaseModel): on: bool
class Tpl(BaseModel): c: str = Field(min_length=2); t: str = Field(min_length=2); p: int = Field(ge=500); d: str = ""
class NL(BaseModel): c: str; t: str; p: int = Field(ge=500)
class Ret(BaseModel):
    cap: Literal["Yarım Kasa", "Tam Kasa"]; ilce: Literal["Ankara (Sincan)", "İstanbul (Tuzla)", "İzmir (Bornova)"]
    cik: Literal["Hemen", "30 Dakika İçinde", "1 Saat İçinde"]

@app.get("/api/plans")
def plans(u=Depends(user)): return PLANS

@app.put("/api/plan")
def set_plan(b: Pl, u=Depends(user)):
    need(u, "business")
    q("update users set plan=? where id=?", b.plan, u["id"])
    if b.plan == "kur" and not u["welcome"]:
        q("update users set balance=balance+2500, welcome=1 where id=?", u["id"]); note(u["id"], "₺2.500 hoş geldin bakiye kredisi hesabınıza eklendi")
    return {"ok": True}

@app.put("/api/share")
def share(b: Sh, u=Depends(user)):
    need(u, "business"); q("update users set share=? where id=?", int(b.on), u["id"]); return {"ok": True}

@app.get("/api/templates")
def templates(u=Depends(user)):
    return [dict(zip("ctpd", t[:4]), co=t[4]) for t in TPL] + q("select c,t,p,d,co from templates where owner_id=?", u["id"])

@app.post("/api/templates")
def add_tpl(b: Tpl, u=Depends(user)):
    need(u, "business")
    q("insert into templates(owner_id,c,t,p,d,co) values(?,?,?,?,?,?)", u["id"], b.c, b.t, b.p, b.d or "—", f"{round(b.p / 300)} kg CO₂")
    return {"ok": True}

@app.post("/api/loads")
def new_load(b: NL, u=Depends(user)):
    need(u, "business")
    q("insert into loads(origin,dest,weight,pallet,km,price,fit,company) values(?,?,?,?,0,?,1,?)", "İstanbul", b.c, b.t, "Şablon yük", b.p, u["name"])
    for z in q("select id from users where role='driver'"): note(z["id"], f"Yeni yük ilanı: İstanbul → {b.c} • {TL(b.p)}")
    return {"ok": True}

@app.post("/api/return")
def go_return(b: Ret, u=Depends(user)):
    need(u, "driver")
    q("update users set ret=? where id=?", json.dumps({"cap": b.cap, "ilce": b.ilce, "cik": b.cik}, ensure_ascii=False), u["id"])
    note(u["id"], f"Boş dönüş bildirildi: {b.cap} • {b.ilce}")
    return {"ok": True}

@app.post("/api/sos")
def sos(u=Depends(user)):
    need(u, "driver"); note(u["id"], "SOS: Acil aktarma talebi operasyon ekibine iletildi"); return {"ok": True}

@app.get("/api/offers/{oid}/photo")
def photo(oid: int, u=Depends(user)):
    o = q("select photo, photo_t from offers where id=? and (biz_id=? or driver_id=?)", oid, u["id"], u["id"], one=True)
    if not o or not o["photo"]: raise HTTPException(404, "Teslimat fotoğrafı yok.")
    return o

dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(dist): app.mount("/", StaticFiles(directory=dist, html=True), name="web")
