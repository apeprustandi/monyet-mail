<template>
  <div class="api-docs">
    <div class="ad-layout">
      <!-- Sidebar nav -->
      <div class="ad-nav">
        <div
          v-for="cat in categories" :key="cat.id"
          class="ad-nav-item"
          :class="{ active: activeCat === cat.id }"
          @click="scrollTo(cat.id)"
        >
          <Icon :icon="cat.icon" width="15" height="15" />
          <span>{{ cat.title }}</span>
          <el-tag size="small" type="info">{{ cat.endpoints.length }}</el-tag>
        </div>
      </div>

      <!-- Content -->
      <div class="ad-content">
        <h2 class="ad-title">Dokumentasi API</h2>
        <p class="ad-desc">
          Base URL: <code>{{ base }}/api</code><br>
          Format response: <code>{ "code": 0, "msg": "success", "data": {...} }</code> — <code>code: 0</code> = sukses.
        </p>

        <div v-for="cat in categories" :key="cat.id" :id="'cat-' + cat.id" class="ad-cat">
          <h3 class="ad-cat-title">
            <Icon :icon="cat.icon" width="18" height="18" />
            {{ cat.title }}
          </h3>
          <p v-if="cat.authNote" class="ad-auth-note">
            <el-tag :type="cat.authType" size="small">{{ cat.authLabel }}</el-tag>
            <span>{{ cat.authNote }}</span>
          </p>

          <div v-for="ep in cat.endpoints" :key="ep.method + ep.path" class="ad-endpoint">
            <div class="ad-head">
              <span class="ad-method" :class="ep.method.toLowerCase()">{{ ep.method }}</span>
              <code class="ad-path">/api{{ ep.path }}</code>
            </div>
            <p v-if="ep.summary" class="ad-summary">{{ ep.summary }}</p>

            <div v-if="ep.params && ep.params.length" class="ad-block">
              <div class="ad-label">{{ ep.method === 'GET' ? 'Query Parameters' : 'Body Parameters (JSON)' }}</div>
              <el-table :data="ep.params" size="small" border>
                <el-table-column prop="name" label="Nama" width="150" />
                <el-table-column prop="type" label="Tipe" width="80" />
                <el-table-column label="Wajib" width="65">
                  <template #default="s">
                    <el-tag :type="s.row.required ? 'danger' : 'info'" size="small">{{ s.row.required ? 'Ya' : '—' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="default" label="Default" width="100" />
                <el-table-column prop="desc" label="Keterangan" />
              </el-table>
            </div>

            <div v-if="ep.reqBody" class="ad-block">
              <div class="ad-label">Contoh Request</div>
              <pre class="ad-code">{{ ep.reqBody }}</pre>
            </div>

            <div v-if="ep.resBody" class="ad-block">
              <div class="ad-label">Contoh Response</div>
              <pre class="ad-code">{{ ep.resBody }}</pre>
            </div>

            <div v-if="ep.curl" class="ad-block">
              <div class="ad-label-row">
                <span class="ad-label">cURL</span>
                <el-button size="small" type="primary" plain @click="copyCurl(ep)">
                  <Icon icon="mingcute:copy-line" width="13" height="13" />
                  <span style="margin-left:4px">Copy</span>
                </el-button>
              </div>
              <pre class="ad-code ad-curl">{{ ep.curl }}</pre>
            </div>
          </div>
        </div>

        <!-- OTP script -->
        <div id="cat-script" class="ad-cat">
          <h3 class="ad-cat-title"><Icon icon="mingcute:terminal-line" width="18" height="18" /> Contoh Script: Cek OTP</h3>
          <div class="ad-label-row">
            <span class="ad-label">Bash + Python</span>
            <el-button size="small" type="primary" plain @click="copyText(otpScript)">
              <Icon icon="mingcute:copy-line" width="13" height="13" /><span style="margin-left:4px">Copy</span>
            </el-button>
          </div>
          <pre class="ad-code ad-curl">{{ otpScript }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import { ElMessage } from "element-plus";

const base = computed(() => window.location.origin);
const activeCat = ref("admin");

const ADMIN_H = `-H "x-admin-auth: YOUR_TOKEN"`;
const JWT_H = `-H "Authorization: Bearer YOUR_JWT"`;

function curl(method, path, authHeader, body, query) {
  let url = `${base.value}/api${path}`;
  if (query) url += query;
  let cmd = `curl -X ${method} \\\n  ${authHeader}`;
  if (body) cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
  cmd += ` \\\n  "${url}"`;
  return cmd;
}
const cAdmin = (m, p, b, q) => curl(m, p, ADMIN_H, b, q);
const cJwt = (m, p, b, q) => curl(m, p, JWT_H, b, q);
const cPub = (m, p, b, q) => curl(m, p, "", b, q).replace(" \\\n  \"", " \\\n  \"");

function copyCurl(ep) {
  navigator.clipboard.writeText(ep.curl).then(() => ElMessage.success("cURL tersalin! Ganti YOUR_TOKEN / YOUR_JWT."));
}
function copyText(t) {
  navigator.clipboard.writeText(t).then(() => ElMessage.success("Tersalin!"));
}
function scrollTo(id) {
  activeCat.value = id;
  document.getElementById("cat-" + id)?.scrollIntoView({ behavior: "smooth" });
}

const otpScript = `#!/bin/bash
TOKEN="isi-global-token"
ADDRESS="user@monyet.dev"

curl -s -H "x-admin-auth: $TOKEN" \\
  "${base.value}/api/admin/mails?address=$ADDRESS&limit=5" \\
  | python3 -c "
import json,sys,re
d = json.load(sys.stdin)
for m in d['results']:
    kode = re.search(r'\\\\b\\\\d{4,8}\\\\b', m['subject'] + ' ' + (m['text'] or ''))
    if kode:
        print(m['sendEmail'], '→', kode.group())
        break
"`;

const categories = computed(() => [
  // ================= ADMIN API =================
  {
    id: "admin", title: "Admin API", icon: "mingcute:key-line",
    authType: "warning", authLabel: "x-admin-auth",
    authNote: "Butuh Global API Token. Aktifkan di System Settings → Integration → Global API Token.",
    endpoints: [
      {
        method: "GET", path: "/admin/mails",
        summary: "Ambil daftar email milik satu alamat. Cocok untuk script auto-cek OTP.",
        params: [
          { name: "address", type: "string", required: true, default: "-", desc: "Alamat email yang dicek" },
          { name: "limit", type: "number", required: false, default: "20", desc: "Maksimal 100" },
          { name: "offset", type: "number", required: false, default: "0", desc: "Pagination" },
        ],
        resBody: `{
  "results": [{
    "emailId": 123,
    "sendEmail": "noreply@layanan.com",
    "toEmail": "user@monyet.dev",
    "subject": "Kode verifikasi: 482913",
    "text": "Kode Anda adalah 482913",
    "createTime": "2026-10-07 12:00:00",
    "unread": 0, "type": 0
  }],
  "count": 42
}`,
        curl: cAdmin("GET", "/admin/mails", null, "?address=user@monyet.dev&limit=10"),
      },
      {
        method: "POST", path: "/admin/mails",
        summary: "Buat/inject email manual ke inbox. Alamat tujuan harus sudah terdaftar.",
        params: [
          { name: "toEmail", type: "string", required: true, default: "-", desc: "Penerima (harus sudah ada)" },
          { name: "subject", type: "string", required: false, default: '""', desc: "Judul" },
          { name: "text", type: "string", required: false, default: '""', desc: "Isi plain text" },
          { name: "content", type: "string", required: false, default: '""', desc: "Isi HTML" },
          { name: "sendEmail", type: "string", required: false, default: '"admin@system"', desc: "Pengirim" },
          { name: "name", type: "string", required: false, default: '""', desc: "Nama pengirim" },
        ],
        reqBody: `{"toEmail":"user@monyet.dev","subject":"Halo","text":"Isi pesan"}`,
        resBody: `{ "code": 0, "msg": "success", "data": { "emailId": 124 } }`,
        curl: cAdmin("POST", "/admin/mails", `{"toEmail":"user@monyet.dev","subject":"Halo","text":"Isi pesan"}`),
      },
      {
        method: "DELETE", path: "/admin/mails",
        summary: "Hapus email by ID atau hapus semua milik satu alamat.",
        params: [
          { name: "emailIds", type: "string", required: false, default: "-", desc: 'Contoh: "1,2,3"' },
          { name: "address", type: "string", required: false, default: "-", desc: "Hapus SEMUA milik alamat ini" },
        ],
        reqBody: `{ "emailIds": "1,2,3" }`,
        resBody: `{ "code": 0, "data": { "deleted": 3 } }`,
        curl: cAdmin("DELETE", "/admin/mails", `{"emailIds":"1,2,3"}`),
      },
      {
        method: "PUT", path: "/admin/mails/read",
        summary: "Tandai sudah/belum dibaca.",
        params: [
          { name: "emailIds", type: "string", required: true, default: "-", desc: 'Contoh: "1,2,3"' },
          { name: "unread", type: "number", required: false, default: "0", desc: "0=sudah dibaca, 1=belum" },
        ],
        reqBody: `{ "emailIds": "1,2,3", "unread": 0 }`,
        resBody: `{ "code": 0, "data": { "updated": 3, "unread": 0 } }`,
        curl: cAdmin("PUT", "/admin/mails/read", `{"emailIds":"1,2,3","unread":0}`),
      },
      {
        method: "GET", path: "/admin/accounts",
        summary: "List alamat mailbox, bisa filter per user.",
        params: [
          { name: "userEmail", type: "string", required: false, default: "-", desc: "Filter milik user ini" },
          { name: "limit", type: "number", required: false, default: "50", desc: "Maksimal 200" },
          { name: "offset", type: "number", required: false, default: "0", desc: "Pagination" },
        ],
        resBody: `{ "code": 0, "data": [{
  "accountId": 5, "email": "belanja@monyet.dev",
  "name": "belanja", "userId": 2 }] }`,
        curl: cAdmin("GET", "/admin/accounts", null, "?userEmail=user@monyet.dev"),
      },
      {
        method: "POST", path: "/admin/accounts",
        summary: "Buat alamat email baru untuk user (bypass limit, seperti dashboard admin).",
        params: [
          { name: "email", type: "string", required: true, default: "-", desc: "Alamat baru" },
          { name: "userEmail", type: "string", required: false, default: "-", desc: "Pemilik (atau pakai userId)" },
          { name: "userId", type: "number", required: false, default: "-", desc: "ID user" },
        ],
        reqBody: `{"email":"baru@monyet.dev","userEmail":"user@monyet.dev"}`,
        resBody: `{ "code": 0, "data": { "email": "baru@monyet.dev", "accountId": 6 } }`,
        curl: cAdmin("POST", "/admin/accounts", `{"email":"baru@monyet.dev","userEmail":"user@monyet.dev"}`),
      },
      {
        method: "DELETE", path: "/admin/accounts",
        summary: "Hapus alamat mailbox (soft delete, bisa di-restore via POST).",
        params: [
          { name: "email", type: "string", required: false, default: "-", desc: "Alamat yang dihapus" },
          { name: "accountId", type: "number", required: false, default: "-", desc: "Alternatif email" },
        ],
        reqBody: `{ "email": "hapus@monyet.dev" }`,
        resBody: `{ "code": 0, "data": { "deleted": "hapus@monyet.dev" } }`,
        curl: cAdmin("DELETE", "/admin/accounts", `{"email":"hapus@monyet.dev"}`),
      },
    ],
  },
  // ================= AUTH =================
  {
    id: "auth", title: "Autentikasi", icon: "mingcute:lock-line",
    authType: "info", authLabel: "Tanpa auth",
    authNote: "Endpoint ini tidak butuh auth. Response login berisi JWT untuk endpoint lain.",
    endpoints: [
      {
        method: "POST", path: "/login", summary: "Login, dapatkan JWT token.",
        reqBody: `{ "email": "admin@monyet.dev", "password": "password123" }`,
        resBody: `{ "code": 0, "data": { "token": "eyJhbGciOi..." } }`,
        curl: cPub("POST", "/login", `{"email":"admin@monyet.dev","password":"xxx"}`),
      },
      {
        method: "POST", path: "/register", summary: "Daftar akun baru (langsung login).",
        reqBody: `{ "email": "user@monyet.dev", "password": "xxx", "confirmPassword": "xxx" }`,
        resBody: `{ "code": 0, "data": "eyJhbGciOi... (jwt)" }`,
      },
      {
        method: "DELETE", path: "/logout", summary: "Logout.",
        params: [], curl: cJwt("DELETE", "/logout"),
      },
    ],
  },
  // ================= PUBLIC =================
  {
    id: "public", title: "Public API", icon: "mingcute:world-2-line",
    authType: "success", authLabel: "Tanpa auth",
    authNote: "Bisa diakses publik tanpa login.",
    endpoints: [
      {
        method: "POST", path: "/public/genToken", summary: "Generate token akses publik untuk sebuah alamat.",
        reqBody: `{ "address": "user@monyet.dev" }`,
        resBody: `{ "code": 0, "data": { "token": "..." } }`,
      },
      {
        method: "POST", path: "/public/emailList", summary: "List email via public token.",
        reqBody: `{ "token": "...", "limit": 20, "offset": 0 }`,
      },
      { method: "POST", path: "/public/addUser", summary: "Tambah user via API publik (jika diaktifkan admin)." },
    ],
  },
  // ================= EMAIL =================
  {
    id: "email", title: "Email", icon: "mingcute:mail-line",
    authType: "", authLabel: "Bearer JWT",
    authNote: 'Butuh header: Authorization: Bearer <jwt_token>',
    endpoints: [
      {
        method: "GET", path: "/email/list", summary: "List email di inbox.",
        params: [
          { name: "accountId", type: "number", required: false, default: "-", desc: "Filter per akun" },
          { name: "keyword", type: "string", required: false, default: "-", desc: "Cari subject/pengirim" },
          { name: "unread", type: "number", required: false, default: "-", desc: "1 = hanya belum dibaca" },
          { name: "limit", type: "number", required: false, default: "20", desc: "Pagination" },
          { name: "offset", type: "number", required: false, default: "0", desc: "Pagination" },
        ],
        curl: cJwt("GET", "/email/list", null, "?limit=20"),
      },
      { method: "GET", path: "/email/latest", summary: "Email terbaru (untuk polling).", curl: cJwt("GET", "/email/latest") },
      {
        method: "GET", path: "/email/content", summary: "Isi lengkap satu email.",
        params: [{ name: "emailId", type: "number", required: true, default: "-", desc: "ID email" }],
        curl: cJwt("GET", "/email/content", null, "?emailId=123"),
      },
      {
        method: "GET", path: "/email/attList", summary: "Daftar attachment.",
        params: [{ name: "emailId", type: "number", required: true, default: "-", desc: "ID email" }],
      },
      {
        method: "POST", path: "/email/send", summary: "Kirim email.",
        reqBody: `{
  "accountId": 1,
  "receiveEmail": "tujuan@contoh.com",
  "subject": "Halo",
  "text": "Isi plain",
  "content": "<p>Isi HTML</p>"
}`,
        curl: cJwt("POST", "/email/send", `{"accountId":1,"receiveEmail":"a@b.com","subject":"Hi"}`),
      },
      {
        method: "PUT", path: "/email/read", summary: "Tandai dibaca.",
        reqBody: `{ "emailIds": [1, 2, 3] }`,
      },
      {
        method: "DELETE", path: "/email/delete", summary: "Hapus email.",
        reqBody: `{ "emailIds": [1, 2] }`,
      },
    ],
  },
  // ================= ACCOUNT =================
  {
    id: "account", title: "Akun Mailbox", icon: "mingcute:user-line",
    authType: "", authLabel: "Bearer JWT", authNote: "Kelola alamat milik user yang login.",
    endpoints: [
      { method: "GET", path: "/account/list", summary: "List semua alamat milik user." },
      {
        method: "POST", path: "/account/add", summary: "Buat alamat baru.",
        reqBody: `{ "prefix": "namauser", "domain": "monyet.dev" }`,
      },
      { method: "DELETE", path: "/account/delete", summary: "Hapus alamat.", reqBody: `{ "accountId": 1 }` },
      { method: "PUT", path: "/account/setName", summary: "Ganti nama tampilan.", reqBody: `{ "accountId": 1, "name": "Nama Baru" }` },
      { method: "PUT", path: "/account/setAsTop", summary: "Pin akun ke atas.", reqBody: `{ "accountId": 1 }` },
      { method: "PUT", path: "/account/cancelTop", summary: "Unpin akun.", reqBody: `{ "accountId": 1 }` },
      { method: "PUT", path: "/account/setAllReceive", summary: "Set semua akun menerima email.", reqBody: `{ "receive": 1 }` },
    ],
  },
  // ================= USER & ROLE =================
  {
    id: "user", title: "User & Role", icon: "mingcute:group-line",
    authType: "danger", authLabel: "Admin",
    authNote: "Hanya admin (butuh permission).",
    endpoints: [
      { method: "GET", path: "/user/list", summary: "List user." },
      { method: "POST", path: "/user/add", summary: "Tambah user manual.", reqBody: `{ "email": "baru@monyet.dev", "password": "...", "roleId": 2 }` },
      { method: "PUT", path: "/user/batchSetStatus", summary: "Aktif/nonaktif/ban sekaligus.", reqBody: `{ "userIds": [1, 2], "status": 1 }` },
      { method: "PUT", path: "/user/batchRestore", summary: "Restore user terhapus.", reqBody: `{ "userIds": [1] }` },
      { method: "DELETE", path: "/user/delete", summary: "Hapus user." },
      { method: "GET", path: "/role/list", summary: "List role." },
      { method: "POST", path: "/role/add", summary: "Tambah role." },
      { method: "GET", path: "/role/permTree", summary: "Struktur permission." },
    ],
  },
  // ================= SETTING =================
  {
    id: "setting", title: "Pengaturan", icon: "mingcute:settings-6-line",
    authType: "danger", authLabel: "Admin", authNote: "Hanya admin.",
    endpoints: [
      { method: "GET", path: "/setting/query", summary: "Ambil semua pengaturan sistem." },
      { method: "PUT", path: "/setting/set", summary: "Ubah pengaturan.", reqBody: `{ "title": "Monyet Mail", "register": 0 }` },
      { method: "GET", path: "/setting/websiteConfig", summary: "Config publik (tanpa auth)." },
      { method: "POST", path: "/setting/globalToken/generate", summary: "Generate Global API Token baru." },
      { method: "PUT", path: "/setting/globalToken/enabled", summary: "Aktif/nonaktif token.", reqBody: `{ "enabled": true }` },
      { method: "GET", path: "/setting/globalToken", summary: "Lihat token saat ini." },
      { method: "POST", path: "/regKey/add", summary: "Buat kode registrasi.", reqBody: `{ "count": 10, "roleId": 2 }` },
      { method: "GET", path: "/regKey/list", summary: "List kode registrasi." },
    ],
  },
  // ================= LAINNYA =================
  {
    id: "other", title: "Lainnya", icon: "mingcute:more-2-line",
    authType: "", authLabel: "Bervariasi", authNote: "Lihat keterangan tiap endpoint.",
    endpoints: [
      { method: "GET", path: "/star/list", summary: "Email berbintang (login)." },
      { method: "POST", path: "/star/add", summary: "Bintangi email.", reqBody: `{ "emailId": 123 }` },
      { method: "DELETE", path: "/star/cancel", summary: "Batalkan bintang.", reqBody: `{ "emailId": 123 }` },
      { method: "POST", path: "/transfer/create", summary: "Transfer email+akun ke user lain.", reqBody: `{ "toUserId": "abc", "accountIds": [1, 2] }` },
      { method: "PUT", path: "/transfer/accept", summary: "Terima transfer.", reqBody: `{ "transferId": 5 }` },
      { method: "GET", path: "/transfer/pending", summary: "Transfer masuk pending." },
      { method: "GET", path: "/sub-worker/list", summary: "List sub-worker." },
      { method: "POST", path: "/sub-worker/add", summary: "Tambah sub-worker.", reqBody: `{ "name": "...", "workerUrl": "...", "apiToken": "..." }` },
      { method: "GET", path: "/my/loginUserInfo", summary: "Info user yang login." },
      { method: "PUT", path: "/my/resetPassword", summary: "Ganti password sendiri." },
      { method: "GET", path: "/analysis/echarts", summary: "Data statistik dashboard." },
      { method: "GET", path: "/allEmail/list", summary: "Semua email (admin)." },
      { method: "GET", path: "/telegram/getEmail/:token", summary: "Ambil email via bot Telegram." },
      { method: "POST", path: "/webhooks", summary: "Webhook receiver." },
      { method: "GET", path: "/init/:secret", summary: "Inisialisasi/migrasi database." },
    ],
  },
]);
</script>

<style lang="scss" scoped>
.api-docs {
  .ad-layout { display: flex; gap: 20px; align-items: flex-start; }
  .ad-nav {
    position: sticky; top: 16px; min-width: 190px;
    border: 1px solid var(--el-border-color); border-radius: 10px;
    padding: 8px; background: var(--el-bg-color);
  }
  .ad-nav-item {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 10px; border-radius: 7px; cursor: pointer;
    font-size: 13.5px; color: var(--el-text-color-regular);
    &:hover { background: var(--el-fill-color-light); }
    &.active { background: var(--el-color-primary-light-9); color: var(--el-color-primary); font-weight: 600; }
    span { flex: 1; }
  }
  .ad-content { flex: 1; min-width: 0; max-width: 860px; }
  .ad-title { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
  .ad-desc { color: var(--el-text-color-secondary); margin: 0 0 20px; line-height: 1.8;
    code { background: var(--el-fill-color-light); padding: 2px 6px; border-radius: 4px; font-size: 12px; } }
  .ad-cat { margin-bottom: 28px; scroll-margin-top: 16px; }
  .ad-cat-title { font-size: 17px; font-weight: 700; margin: 0 0 10px; display: flex; align-items: center; gap: 8px;
    padding-bottom: 8px; border-bottom: 2px solid var(--el-color-primary-light-7); }
  .ad-auth-note { display: flex; align-items: center; gap: 8px; margin: 0 0 14px;
    color: var(--el-text-color-secondary); font-size: 13px; }
  .ad-endpoint {
    border: 1px solid var(--el-border-color); border-radius: 10px;
    padding: 16px; margin-bottom: 14px; background: var(--el-bg-color);
  }
  .ad-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
  .ad-method {
    font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 5px;
    color: #fff; min-width: 62px; text-align: center;
    &.get { background: #67c23a; } &.post { background: #409eff; }
    &.put { background: #e6a23c; } &.delete { background: #f56c6c; }
  }
  .ad-path { font-size: 14px; font-weight: 600; word-break: break-all; }
  .ad-summary { margin: 0 0 4px; color: var(--el-text-color-regular); font-size: 13.5px; line-height: 1.6; }
  .ad-block { margin-top: 12px; }
  .ad-label { font-weight: 600; font-size: 13px; margin-bottom: 6px; }
  .ad-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;
    .ad-label { margin-bottom: 0; } }
  .ad-code {
    background: #1e1e2e; color: #cdd6f4; border-radius: 8px; padding: 13px;
    font-size: 12.5px; line-height: 1.65; overflow-x: auto; white-space: pre;
    margin: 0; font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  }
  .ad-curl { color: #a6e3a1; }
  @media (max-width: 768px) {
    .ad-layout { flex-direction: column; }
    .ad-nav { position: static; display: flex; overflow-x: auto; min-width: 0; width: 100%; }
    .ad-nav-item { white-space: nowrap; }
  }
}
</style>
