# GölgeFilo – React + FastAPI

`backend/` FastAPI + SQLite (JWT benzeri imzalı token, PBKDF2 şifre) · `frontend/` React + Vite + TypeScript (mobil öncelikli).
Demo hesaplar: `demo@isletme.com` / `demo@sofor.com` — şifre `demo123`.

## Geliştirme
```
cd backend && pip install -r requirements.txt && uvicorn main:app --reload      # :8000
cd frontend && npm install && npm run dev                                       # :5173 (/api proxy'lenir)
```
## Tek sunucu (üretim)
`cd frontend && npm run build` → `uvicorn main:app` (backend, `frontend/dist`'i de sunar). `GF_SECRET` ortam değişkenini mutlaka değiştir.

## Telefon uygulaması (Capacitor)
```
cd frontend && VITE_API=https://api.alanadiniz.com npm run build
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init GölgeFilo app.golgefilo --web-dir dist && npx cap add android && npx cap sync && npx cap open android
```
## Akış
Şoför teklif verir → işletme onaylar (tutar escrow'a kilitlenir) → şoför mühür / varış / 4 haneli kod → ödeme şoföre (%6 komisyon sonrası) aktarılır.
