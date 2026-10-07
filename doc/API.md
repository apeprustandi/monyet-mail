# Dokumentasi API Monyet Mail

Base URL: `https://monyet-mail.receh34.workers.dev/api`

Semua endpoint diawali `/api`. Response selalu JSON dengan format:

```json
{
  "code": 0,
  "msg": "success",
  "data": { ... }
}
```

`code: 0` = sukses. Kode lain = error (lihat pesan di `msg`).

---

## Autentikasi

Kebanyakan endpoint butuh JWT token. Dapatkan via login, lalu kirim di header:

```
Authorization: Bearer <jwt_token>
```

### POST `/api/login`
Login user.
```json
// Request
{ "email": "admin@monyet.dev", "password": "password123" }

// Response data
{ "token": "eyJhbGciOi..." }
```

### POST `/api/register`
Daftar akun baru.
```json
// Request
{
  "email": "user@monyet.dev",
  "password": "password123",
  "confirmPassword": "password123",
  "token": "turnstile-token-jika-aktif"
}
// Response data: JWT token (langsung login)
```

### DELETE `/api/logout`
Logout. Header: `Authorization: Bearer <token>`.

---

## Admin API (tanpa login, pakai global token)

Aktifkan dulu di **System Settings → Integration → Global API Token** (generate token + enable).

Header wajib:
```
x-admin-auth: <global_token>
```

### GET `/api/admin/mails`
Query email milik alamat tertentu tanpa login. Cocok untuk script auto-cek OTP/kode verifikasi.

| Param | Wajib | Default | Keterangan |
|-------|-------|---------|------------|
| address | Ya | - | Alamat email yang dicek |
| limit | Tidak | 20 | Max 100 |
| offset | Tidak | 0 | Untuk pagination |

```bash
curl -H "x-admin-auth: TOKEN" \
  "https://monyet-mail.receh34.workers.dev/api/admin/mails?address=user@monyet.dev&limit=10"
```

Response `data`:
```json
{
  "results": [
    {
      "emailId": 123,
      "messageId": "<...>",
      "sendEmail": "noreply@layanan.com",
      "name": "Layanan",
      "toEmail": "user@monyet.dev",
      "subject": "Kode verifikasi: 482913",
      "text": "Kode Anda adalah 482913",
      "content": "<html>...",
      "createTime": "2026-10-07 12:00:00",
      "unread": 1,
      "type": 0
    }
  ],
  "count": 42
}
```

---

## Public API (tanpa auth)

### POST `/api/public/genToken`
Generate token akses publik untuk sebuah alamat email.
```json
// Request
{ "address": "user@monyet.dev" }
// Response data: { "token": "..." }
```

### POST `/api/public/emailList`
List email via public token.
```json
// Request
{ "token": "...", "limit": 20, "offset": 0 }
```

### POST `/api/public/addUser`
Tambah user via API publik (jika diaktifkan admin).

---

## Email (butuh login)

### GET `/api/email/list`
List email di inbox.

| Param | Keterangan |
|-------|------------|
| accountId | Filter per akun mailbox |
| keyword | Cari di subject/pengirim |
| unread | `1` = hanya belum dibaca |
| limit / offset | Pagination |

### GET `/api/email/latest`
Email terbaru (untuk polling/notifikasi).

### GET `/api/email/content`
Isi lengkap satu email.
| Param | Wajib | Keterangan |
|-------|-------|------------|
| emailId | Ya | ID email |

### GET `/api/email/attList`
Daftar attachment.
| Param | Wajib |
|-------|-------|
| emailId | Ya |

### POST `/api/email/send`
Kirim email.
```json
{
  "accountId": 1,
  "name": "Nama Pengirim",
  "receiveEmail": "tujuan@contoh.com",
  "subject": "Halo",
  "text": "Isi plain text",
  "content": "<p>Isi HTML</p>",
  "attachments": []
}
```

### PUT `/api/email/read`
Tandai email dibaca.
```json
{ "emailIds": [1, 2, 3] }
```

### DELETE `/api/email/delete`
Hapus email.
```json
{ "emailIds": [1, 2] }
```

---

## Akun Mailbox (butuh login)

### GET `/api/account/list`
List semua alamat mailbox milik user.

### POST `/api/account/add`
Buat alamat email baru.
```json
{ "prefix": "namauser", "domain": "monyet.dev" }
// → namauser@monyet.dev
```

### DELETE `/api/account/delete`
```json
{ "accountId": 1 }
```

### PUT `/api/account/setName`
Ganti nama tampilan akun.
```json
{ "accountId": 1, "name": "Nama Baru" }
```

### PUT `/api/account/setAsTop` / `/api/account/cancelTop`
Pin/unpin akun ke atas.
```json
{ "accountId": 1 }
```

### PUT `/api/account/setAllReceive`
Set semua akun menerima email.
```json
{ "receive": 1 }
```

---

## User & Role (admin)

### GET `/api/user/list`
List user (pagination via `limit`/`offset`).

### POST `/api/user/add`
Tambah user manual.
```json
{ "email": "baru@monyet.dev", "password": "...", "roleId": 2 }
```

### PUT `/api/user/batchSetStatus`
Aktif/nonaktif/ban user sekaligus.
```json
{ "userIds": [1, 2], "status": 1 }
```

### PUT `/api/user/batchRestore`
Restore user yang dihapus.
```json
{ "userIds": [1] }
```

### DELETE `/api/user/delete`, `DELETE /api/user/deleteAccount`
Hapus user / hapus akun mailbox milik user.

### GET `/api/role/list`, POST `/api/role/add`, PUT `/api/role/set`
Kelola role & permission.

### GET `/api/role/permTree`, GET `/api/role/selectUse`
Struktur permission & role yang tersedia.

---

## Kode Registrasi (admin)

### POST `/api/regKey/add`
Buat kode undangan registrasi.
```json
{ "count": 10, "roleId": 2 }
```

### GET `/api/regKey/list`, GET `/api/regKey/history`
List & riwayat kode.

### DELETE `/api/regKey/delete`, DELETE `/api/regKey/clearNotUse`
Hapus kode.

---

## Pengaturan (admin)

### GET `/api/setting/query`
Ambil semua pengaturan sistem.

### PUT `/api/setting/set`
Ubah pengaturan.
```json
{ "title": "Monyet Mail", "register": 0 }
```

### GET `/api/setting/websiteConfig`
Config publik untuk frontend (tanpa auth).

### POST `/api/setting/globalToken/generate`
Generate global API token baru.

### PUT `/api/setting/globalToken/enabled`
Aktif/nonaktif global token.
```json
{ "enabled": true }
```

### GET `/api/setting/globalToken`
Lihat token saat ini (admin only).

---

## Favorit

### GET `/api/star/list`
List email berbintang.

### POST `/api/star/add`
```json
{ "emailId": 123 }
```

### DELETE `/api/star/cancel`
```json
{ "emailId": 123 }
```

---

## Transfer Email antar User

### POST `/api/transfer/create`
Kirim email + akun ke user lain.
```json
{ "toUserId": "abc123", "accountIds": [1, 2] }
```

### PUT `/api/transfer/accept` / `/api/transfer/reject`
Terima/tolak transfer masuk.
```json
{ "transferId": 5 }
```

### GET `/api/transfer/pending`, `/api/transfer/sent`, `/api/transfer/received-history`
List transfer.

---

## Sub-Worker

Worker ringan tambahan (hanya terima email + API).

- `GET /api/sub-worker/list`
- `POST /api/sub-worker/add` — `{ "name": "...", "workerUrl": "...", "apiToken": "..." }`
- `PUT /api/sub-worker/:id` — edit
- `PUT /api/sub-worker/:id/status` — aktif/nonaktif
- `DELETE /api/sub-worker/:id`
- `GET /api/sub-worker/:id/mails` — agregat email
- `GET /api/sub-worker/:id/mail/:mailId` — detail email
- `POST /api/sub-worker/test` — tes koneksi

---

## Lainnya

| Endpoint | Keterangan |
|----------|------------|
| `GET /api/my/loginUserInfo` | Info user yang login |
| `PUT /api/my/lang` | Ganti bahasa (`{"lang": "en"}` / `"zh"`) |
| `PUT /api/my/resetPassword` | Ganti password sendiri |
| `GET /api/analysis/echarts` | Data statistik dashboard |
| `GET /api/allEmail/list` | Semua email (admin) |
| `GET /api/allEmail/latest` | Email terbaru semua user (admin) |
| `DELETE /api/allEmail/delete` | Hapus (admin) |
| `GET /api/telegram/getEmail/:token` | Ambil email via bot Telegram |
| `POST /api/webhooks` | Webhook receiver |
| `POST /api/oauth/linuxDo/login` | Login via LinuxDo OAuth |
| `PUT /api/oauth/bindUser` | Bind akun OAuth |
| `GET /api/init/:secret` | Inisialisasi/migrasi database |

---

## Contoh: Cek OTP via Script

```bash
#!/bin/bash
TOKEN="isi-global-token"
ADDRESS="user@monyet.dev"

curl -s -H "x-admin-auth: $TOKEN" \
  "https://monyet-mail.receh34.workers.dev/api/admin/mails?address=$ADDRESS&limit=5" \
  | python3 -c "
import json,sys,re
d = json.load(sys.stdin)
for m in d['data']['results']:
    kode = re.search(r'\b\d{4,8}\b', m['subject'] + ' ' + (m['text'] or ''))
    if kode:
        print(m['sendEmail'], '→', kode.group())
        break
"
```
