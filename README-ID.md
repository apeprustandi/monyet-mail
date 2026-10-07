<div align="center">

# Monyet Mail

**Layanan email self-hosted yang sepenuhnya berjalan di Cloudflare**

> Fork dari [PastKing/xi-mail](https://github.com/PastKing/xi-mail) dengan modifikasi kustom

Fork dari [cloud-mail](https://github.com/eoao/cloud-mail) dengan desain ulang UI menyeluruh dan fitur yang terus bertambah

[![Version](https://img.shields.io/badge/Version-v3.5.5-6366f1)](https://github.com/apeprustandi/monyet-mail/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/PastKing/xi-mail?style=flat&color=6366f1)](https://github.com/apeprustandi/monyet-mail/stargazers)
[![Telegram](https://img.shields.io/badge/Telegram-@pk__oa-26A5E4?logo=telegram)](https://t.me/pk_oa)

[English](README.md) | [Indonesia](README-ID.md)

</div>

Dengan satu domain yang di-host di Cloudflare, Anda bisa deploy platform email lengkap — multi-akun, multi-domain, permission bertingkat — tanpa biaya. Berjalan di Workers + D1 + KV + R2, tanpa server yang perlu di-maintain.

---

## 📸 Preview

| Login template | Floating Island |
|:---:|:---:|
| ![Split login template](doc/images/template/Split.png) | ![Floating Island navigation](doc/images/layout/FloatingIsland.png) |
| **Domain management** | **Analytics** |
| ![Domain management](doc/images/system-setting-domain.png) | ![Analytics](doc/images/analysis.png) |

Template lainnya, layout, dan screenshot fitur: [Screenshots](doc/PREVIEW-ID.md).

## 🔑 Live demo

Coba di [mail.azx.us](https://mail.azx.us) menggunakan kode invite `viewUser` (terbatas untuk suffix `@nlfree.me`). Hanya untuk preview — jangan menyimpan email asli di sana.

---

## ✨ Highlights

**Interface**
Sembilan template login dengan komposisi yang benar-benar berbeda, termasuk Open Letter, Mail Terminal, dan Postal Passport, plus enam tema warna dan empat layout setelah login (sidebar penuh, sidebar ikon saja, navigasi atas, dan Floating Island), semuanya bisa diganti dari system settings dan tersimpan di sisi server. Floating Island memakai rail terpisah di desktop dan dock bawah di mobile. Ikon diseragamkan memakai `mingcute`; UI tersedia dalam Bahasa Inggris dan Indonesia, dan preferensi bahasa mengikuti akun di semua perangkat.

**Users and accounts**
User ID berupa string alfanumerik acak dan bisa disalin dengan satu klik. Setiap user bisa memiliki hingga 100 akun mailbox, dan mailbox yang dihapus bisa dibuat ulang. Mailbox bisa ditransfer ke user lain beserta seluruh emailnya, dengan persetujuan penerima. Role memiliki field `level`, sehingga user hanya bisa menerbitkan kode invite untuk role di bawahnya.

**Delivery control**
Filter domain pengirim berjalan dalam mode blacklist atau whitelist; dalam mode whitelist hanya provider yang diotorisasi yang diterima. Envelope sender SMTP maupun header `From` sama-sama diperiksa, dengan pencocokan subdomain. Ada juga blacklist kata kunci alamat serta petunjuk dan link kode invite yang bisa dikonfigurasi (terpisah untuk Bahasa Inggris dan Indonesia).

**Domain management**
Tidak perlu mengedit `wrangler.toml` — tambah, hapus, aktifkan, dan nonaktifkan domain langsung di system settings, dan urutkan dengan drag atau tombol atas/bawah. Urutan tersebut persis menjadi urutan suffix mailbox di halaman registrasi, dengan entri pertama sebagai default.

**Deployment shapes**
Deploy frontend dan Worker bersamaan, atau jalankan `build:standalone` untuk menghasilkan frontend statis untuk CF Pages, Vercel, atau hosting statis lainnya. Frontend bisa terhubung ke beberapa instance Worker sekaligus dan menggabungkan datanya, dan `mail-worker-sub/` menyediakan template sub-worker ringan yang hanya menerima email dan melayani API — tanpa sistem user, tanpa halaman.

**Admin API**
Buat global API token dan query email tanpa login via header `x-admin-auth`:

```http
GET /api/admin/mails?limit=20&offset=0&address=user@domain.com
x-admin-auth: <your-token>
```

---

## 🚀 Deployment

Prasyarat: Node.js ≥ 20, `npx wrangler login` sudah selesai, dan domain yang di-host di Cloudflare dengan Email Routing yang sudah aktif.

```bash
git clone https://github.com/apeprustandi/monyet-mail.git
cd monyet-mail/mail-worker && npm install

# Create Cloudflare resources and note the returned IDs
npx wrangler d1 create xi-mail
npx wrangler kv namespace create kv
npx wrangler r2 bucket create xi-mail

# Fill in the configuration
cp wrangler.example.toml wrangler.toml

# Build the frontend and deploy
cd ../mail-view && npm install && npm run build
cd ../mail-worker && npx wrangler deploy
```

Setelah deploy, kunjungi `https://your-worker.workers.dev/api/init/<JWT_SECRET>` untuk inisialisasi atau migrasi skema database.

Field penting di `wrangler.toml`:

```toml
[vars]
domain      = ["mail.example.com"]   # Domain list; may be left empty once domains are managed in system settings
admin       = "admin@example.com"    # Admin address, immutable after initialization
jwt_secret  = "your-secret"          # JWT secret, at least 32 random characters
```

### Standalone frontend

```bash
cd mail-view
VITE_BASE_URL=https://your-worker.workers.dev/api npm run build:standalone
# Deploy dist/ to CF Pages, Vercel or any static host
```

Tanpa `VITE_BASE_URL`, kunjungan pertama akan redirect ke `/setup` agar alamat Worker bisa dimasukkan manual.

Untuk panduan yang lebih detail, lihat [dokumentasi cloud-mail](https://github.com/eoao/cloud-mail).

---

## 📋 Release history

| Version | Summary |
|---------|---------|
| **v3.5.5** | Perbaikan potensi risiko keamanan |
| **v3.5.4** | Dock mobile menyembunyikan tombol "More" saat tidak ada tujuan lain |
| **v3.5.3** | Kode verifikasi lebih akurat: tidak ada lagi kode terpotong atau token URL yang dikira OTP |
| **v3.5.2** | Floating Island kini menyematkan transfer mailbox di rail di atas Settings; user ID berada di atas email; catatan rilis 3.4.x dilipat |
| **v3.5.1** | Ekstraksi kode aktif secara default di Integrations, dengan pemilih model Workers AI; model berjalan lebih dulu dan regex hanya sebagai fallback; sub-worker kini mendukung query plus-address dan auto cleanup harian |
| **v3.5.0** | Daftar email kini mengambil kolom ringkasan dengan body yang lazy-loaded plus index database baru; ditambahkan auto cleaning email, switch hard-delete, ekstraksi kode verifikasi dengan salin satu klik, sub-addressing, dan notifikasi email baru |
| **v3.4.x** | Floating Island (rail desktop + dock mobile) dan sembilan template login; settings dipecah menjadi sub-halaman dengan sorting domain inline; transfer primary-mailbox diblokir; inline image satu langkah dan perbaikan send-loss |
| **v3.3.x** | Mode whitelist pengirim; blacklist dan whitelist digabung dalam satu pintu masuk; `/settings` diurut ulang dengan click-to-copy ID; set ikon dan ukuran diseragamkan |
| **v3.2.x** | Perbaikan pemblokiran domain pengirim (envelope + header `From`); sidebar dipersempit menjadi 200px |
| **v3.1.0** | Agregasi sub-worker; preferensi bahasa tersimpan di akun user |
| **v3.0.0** | Pemisahan frontend/backend; arsitektur multi-server; standalone deployment |
| **v2.0.0** | Sistem template appearance; layout setelah login bisa diganti; penulisan ulang system settings |

---

## 🛠️ Stack and layout

Backend: Cloudflare Workers dengan Hono, Drizzle ORM, dan D1 / KV / R2. Frontend: Vue 3, Vite, Element Plus, Pinia, TailwindCSS 4, dan vue-i18n.

```
monyet-mail/
├── mail-worker/       # Main worker: API, business logic, auth, migrations
├── mail-view/         # Vue 3 frontend: layout, pages, login templates, themes, i18n
├── mail-worker-sub/   # Sub-worker template: mail receiving + API, with its own docs
└── doc/images/        # Screenshots
```

---

## 💬 Community and support

[GitHub](https://github.com/apeprustandi/monyet-mail) · [Telegram @pk_oa](https://t.me/pk_oa) · upstream [eoao/cloud-mail](https://github.com/eoao/cloud-mail)

If this project helps you, USDT donations are welcome:

| Network | Address |
|---------|---------|
| BEP20 (BSC) | `0x555390f5c07cf76cc344f42612196e8669e3586b` |
| TRC20 (TRON) | `TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G` |

---

## 📄 License

[MIT License](LICENSE). The upstream project [eoao/cloud-mail](https://github.com/eoao/cloud-mail) is also MIT licensed, and its original copyright notice is preserved here.
