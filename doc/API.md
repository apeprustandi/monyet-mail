# Dokumentasi API Monyet Mail

Base URL: `https://monyet.dev/api`

Semua endpoint diawali `/api`. Response selalu JSON:

```json
{
  "code": 0,
  "msg": "success",
  "data": { ... }
}
```

`code: 0` = sukses. Kode lain = error (lihat `msg`).

---

# 🔑 API Admin (x-admin-auth)

Endpoint di section ini **hanya** bisa diakses dengan header:

```
x-admin-auth: <global_token>
```

**Cara dapat token:** login sebagai admin → **System Settings → Security → Global API Token** → Generate + Enable.

Tidak butuh login/JWT. Cocok untuk script, bot, dan integrasi eksternal.

---

## GET `/api/admin/mails`

Ambil daftar email milik satu alamat. Cocok untuk script auto-cek OTP/kode verifikasi.

| Param | Wajib | Default | Keterangan |
|-------|-------|---------|------------|
| address | Ya | - | Alamat email yang dicek |
| limit | Tidak | 20 | Maksimal 100 |
| offset | Tidak | 0 | Untuk pagination |

```bash
curl -X GET https://monyet.dev/api/admin/mails?address=user@monyet.dev&limit=10 \
  -H "x-admin-auth: token_rahasia_kamu"
```

Contoh response `data`:
```json
{
  "results": [
    {
      "emailId": 123,
      "messageId": "<abc@mail.com>",
      "sendEmail": "noreply@layanan.com",
      "name": "Layanan",
      "toEmail": "user@monyet.dev",
      "subject": "Kode verifikasi: 482913",
      "text": "Kode Anda adalah 482913",
      "content": "<p>Kode Anda adalah 482913</p>",
      "createTime": "2026-10-07 12:00:00",
      "unread": 0,
      "type": 0
    }
  ],
  "count": 42
}
// unread: 0 = belum dibaca, 1 = sudah dibaca
```

---

## POST `/api/admin/mails`

Buat/inject email manual ke inbox alamat tertentu. Alamat tujuan harus sudah terdaftar di sistem.

| Param | Wajib | Default | Keterangan |
|-------|-------|---------|------------|
| toEmail | Ya | - | Alamat penerima (harus sudah ada) |
| subject | Tidak | "" | Judul email |
| text | Tidak | "" | Isi plain text |
| content | Tidak | "" | Isi HTML |
| sendEmail | Tidak | "admin@system" | Alamat pengirim |
| name | Tidak | "" | Nama pengirim |

```bash
curl -X POST https://monyet.dev/api/admin/mails \
  -H "x-admin-auth: token_rahasia_kamu" \
  -H "Content-Type: application/json" \
  -d '{"toEmail":"user@monyet.dev","subject":"Halo","text":"Isi pesan"}'
```

Contoh response:
```json
{ "code": 0, "msg": "success", "data": { "emailId": 124 } }
```

---

## DELETE `/api/admin/mails`

Hapus email. Bisa by ID (beberapa sekaligus) atau hapus semua milik satu alamat.

| Param | Wajib | Keterangan |
|-------|-------|------------|
| emailIds | Salah satu | ID pisah koma. Contoh: `"1,2,3"` |
| address | Salah satu | Hapus SEMUA email milik alamat ini |

```bash
# Hapus by ID
curl -X DELETE https://monyet.dev/api/admin/mails \
  -H "x-admin-auth: token_rahasia_kamu" \
  -H "Content-Type: application/json" \
  -d '{"emailIds":"1,2,3"}'

# Hapus semua milik satu alamat
curl -X DELETE https://monyet.dev/api/admin/mails \
  -H "x-admin-auth: token_rahasia_kamu" \
  -H "Content-Type: application/json" \
  -d '{"address":"user@monyet.dev"}'
```

---

## PUT `/api/admin/mails/read`

Tandai email sudah dibaca atau belum dibaca.

| Param | Wajib | Default | Keterangan |
|-------|-------|---------|------------|
| emailIds | Ya | - | ID pisah koma. Contoh: `"1,2,3"` |
| unread | Tidak | 0 | 0 = sudah dibaca, 1 = belum dibaca |

```bash
curl -X PUT https://monyet.dev/api/admin/mails/read \
  -H "x-admin-auth: token_rahasia_kamu" \
  -H "Content-Type: application/json" \
  -d '{"emailIds":"1,2,3","unread":0}'
```

---

## GET `/api/admin/accounts`

Lihat daftar alamat mailbox. Bisa filter milik user tertentu.

| Param | Wajib | Default | Keterangan |
|-------|-------|---------|------------|
| userEmail | Tidak | - | Filter hanya milik user ini |
| limit | Tidak | 50 | Maksimal 200 |
| offset | Tidak | 0 | Untuk pagination |

```bash
curl -X GET https://monyet.dev/api/admin/accounts?userEmail=user@monyet.dev \
  -H "x-admin-auth: token_rahasia_kamu"
```

Contoh response:
```json
{
  "code": 0, "msg": "success",
  "data": [
    {
      "accountId": 5,
      "email": "belanja@monyet.dev",
      "name": "belanja",
      "userId": 2,
      "createTime": "2026-10-07 10:00:00"
    }
  ]
}
```

---

## POST `/api/admin/accounts`

Buat alamat email baru untuk user tertentu. Bypass limit jumlah alamat (seperti dashboard admin). Domain harus terdaftar di sistem.

| Param | Wajib | Keterangan |
|-------|-------|------------|
| email | Ya | Alamat baru, mis. `baru@monyet.dev` |
| userEmail | Salah satu | Email user pemilik |
| userId | Salah satu | ID user (alternatif userEmail) |

```bash
curl -X POST https://monyet.dev/api/admin/accounts \
  -H "x-admin-auth: token_rahasia_kamu" \
  -H "Content-Type: application/json" \
  -d '{"email":"baru@monyet.dev","userEmail":"user@monyet.dev"}'
```

Contoh response:
```json
{ "code": 0, "msg": "success", "data": { "email": "baru@monyet.dev", "accountId": 6 } }
// Jika alamat pernah dihapus (restore):
// { "code": 0, "data": { "restored": "baru@monyet.dev" } }
```

---

## DELETE `/api/admin/accounts`

Hapus alamat mailbox (soft delete — bisa di-restore dengan POST lagi).

| Param | Wajib | Keterangan |
|-------|-------|------------|
| email | Salah satu | Alamat yang dihapus |
| accountId | Salah satu | ID akun (alternatif email) |

```bash
curl -X DELETE https://monyet.dev/api/admin/accounts \
  -H "x-admin-auth: token_rahasia_kamu" \
  -H "Content-Type: application/json" \
  -d '{"email":"hapus@monyet.dev"}'
```

---

## Contoh Script: Cek OTP Otomatis

```bash
#!/bin/bash
TOKEN="isi-global-token"
ADDRESS="user@monyet.dev"

curl -s -H "x-admin-auth: $TOKEN" \
  "https://monyet.dev/api/admin/mails?address=$ADDRESS&limit=5" \
  | python3 -c "
import json,sys,re
d = json.load(sys.stdin)
for m in d['results']:
    kode = re.search(r'\b\d{4,8}\b', m['subject'] + ' ' + (m['text'] or ''))
    if kode:
        print(m['sendEmail'], '→', kode.group())
        break
"
```

---

---

# 👤 API User (butuh login)

Endpoint di section ini butuh JWT token. Dapatkan via login:

```bash
curl -X POST https://monyet.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@monyet.dev","password":"xxx"}'
# → { "code": 0, "data": { "token": "eyJhbGciOi..." } }
```

Lalu kirim di setiap request:
```
Authorization: Bearer <jwt_token>
```

---

## Autentikasi

### POST `/api/login`
```json
// Request
{ "email": "admin@monyet.dev", "password": "password123" }
// Response data: { "token": "eyJhbGciOi..." }
```

### POST `/api/register`
```json
// Request
{ "email": "user@monyet.dev", "password": "password123", "confirmPassword": "password123" }
// Response: JWT token (langsung login)
```

### DELETE `/api/logout`
Logout (butuh JWT).

---

## Email

### GET `/api/email/list`
| Param | Keterangan |
|-------|------------|
| accountId | Filter per akun mailbox |
| keyword | Cari di subject/pengirim |
| unread | `1` = hanya belum dibaca |
| limit / offset | Pagination |

### GET `/api/email/latest`
Email terbaru (untuk polling/notifikasi).

### GET `/api/email/content?emailId=123`
Isi lengkap satu email.

### GET `/api/email/attList?emailId=123`
Daftar attachment.

### POST `/api/email/send`
```json
{
  "accountId": 1,
  "receiveEmail": "tujuan@contoh.com",
  "subject": "Halo",
  "text": "Isi plain text",
  "content": "<p>Isi HTML</p>"
}
```

### PUT `/api/email/read`
```json
{ "emailIds": [1, 2, 3] }
```

### DELETE `/api/email/delete`
```json
{ "emailIds": [1, 2] }
```

---

## Akun Mailbox

### GET `/api/account/list`
List semua alamat milik user.

### POST `/api/account/add`
```json
{ "prefix": "namauser", "domain": "monyet.dev" }
// → namauser@monyet.dev
```

### DELETE `/api/account/delete`
```json
{ "accountId": 1 }
```

### PUT `/api/account/setName`
```json
{ "accountId": 1, "name": "Nama Baru" }
```

### PUT `/api/account/setAsTop` / `/api/account/cancelTop`
```json
{ "accountId": 1 }
```

### PUT `/api/account/setAllReceive`
```json
{ "receive": 1 }
```

---

## Favorit

- `GET /api/star/list`
- `POST /api/star/add` — `{ "emailId": 123 }`
- `DELETE /api/star/cancel` — `{ "emailId": 123 }`

---

## Transfer

- `POST /api/transfer/create` — `{ "toUserId": "abc", "accountIds": [1, 2] }`
- `PUT /api/transfer/accept` / `/api/transfer/reject` — `{ "transferId": 5 }`
- `GET /api/transfer/pending`, `/api/transfer/sent`, `/api/transfer/received-history`

---

## Akun Saya

- `GET /api/my/loginUserInfo`
- `PUT /api/my/lang` — `{ "lang": "en" }`
- `PUT /api/my/resetPassword`

---

---

# 🌐 Public API (tanpa auth)

### POST `/api/public/genToken`
```json
// Request
{ "address": "user@monyet.dev" }
// Response data: { "token": "..." }
```

### POST `/api/public/emailList`
```json
// Request
{ "token": "...", "limit": 20, "offset": 0 }
```

### POST `/api/public/addUser`
Tambah user via API publik (jika diaktifkan admin).

---

---

# ⚙️ API Admin Panel (butuh login admin)

### User & Role
- `GET /api/user/list`
- `POST /api/user/add` — `{ "email": "...", "password": "...", "roleId": 2 }`
- `PUT /api/user/batchSetStatus` — `{ "userIds": [1,2], "status": 1 }`
- `DELETE /api/user/delete`

### Pengaturan
- `GET /api/setting/query`
- `PUT /api/setting/set` — `{ "title": "Monyet Mail" }`
- `GET /api/setting/websiteConfig` (tanpa auth)
- `POST /api/setting/globalToken/generate`
- `PUT /api/setting/globalToken/enabled` — `{ "enabled": true }`

### Kode Registrasi
- `POST /api/regKey/add` — `{ "count": 10, "roleId": 2 }`
- `GET /api/regKey/list`

### Lainnya
- `GET /api/analysis/echarts` — statistik dashboard
- `GET /api/allEmail/list` — semua email (admin)
- `GET /api/sub-worker/list`
- `POST /api/sub-worker/add` — `{ "name": "...", "workerUrl": "...", "apiToken": "..." }`
- `GET /api/telegram/getEmail/:token`
- `POST /api/webhooks`
- `GET /api/init/:secret` — inisialisasi DB
