<template>
  <div class="api-docs">
    <h2 class="ad-title">Dokumentasi API</h2>
    <p class="ad-desc">Semua endpoint di bawah butuh header <code>x-admin-auth: &lt;Global API Token&gt;</code>.<br>
    Token diatur di <b>System Settings → Integration → Global API Token</b>.</p>

    <el-alert
      title="Format Response"
      type="info"
      description='Semua response JSON: { "code": 0, "msg": "success", "data": {...} }. code: 0 = sukses.'
      show-icon :closable="false" class="ad-alert"
    />

    <div v-for="ep in endpoints" :key="ep.method + ep.path" class="ad-endpoint">
      <div class="ad-head">
        <span class="ad-method" :class="ep.method.toLowerCase()">{{ ep.method }}</span>
        <code class="ad-path">/api{{ ep.path }}</code>
      </div>
      <p class="ad-summary">{{ ep.summary }}</p>

      <!-- Params -->
      <div v-if="ep.params && ep.params.length" class="ad-block">
        <div class="ad-label">{{ ep.method === 'GET' ? 'Query Parameters' : 'Body Parameters (JSON)' }}</div>
        <el-table :data="ep.params" size="small" border>
          <el-table-column prop="name" label="Nama" width="150" />
          <el-table-column prop="type" label="Tipe" width="90" />
          <el-table-column label="Wajib" width="70">
            <template #default="s">
              <el-tag :type="s.row.required ? 'danger' : 'info'" size="small">{{ s.row.required ? 'Ya' : 'Tidak' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="default" label="Default" width="110" />
          <el-table-column prop="desc" label="Keterangan" />
        </el-table>
      </div>

      <!-- Request body example -->
      <div v-if="ep.reqBody" class="ad-block">
        <div class="ad-label">Contoh Request Body</div>
        <pre class="ad-code">{{ ep.reqBody }}</pre>
      </div>

      <!-- Response example -->
      <div v-if="ep.resBody" class="ad-block">
        <div class="ad-label">Contoh Response</div>
        <pre class="ad-code">{{ ep.resBody }}</pre>
      </div>

      <!-- Curl -->
      <div class="ad-block">
        <div class="ad-label-row">
          <span class="ad-label">cURL</span>
          <el-button size="small" type="primary" plain @click="copyCurl(ep)">
            <Icon icon="mingcute:copy-line" width="13" height="13" />
            <span style="margin-left:4px">Copy cURL</span>
          </el-button>
        </div>
        <pre class="ad-code ad-curl">{{ ep.curl }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import { ElMessage } from "element-plus";

const base = computed(() => window.location.origin);
const T = "YOUR_TOKEN";

function curl(method, path, body, query) {
  let url = `${base.value}/api${path}`;
  if (query) url += query;
  let cmd = `curl -X ${method} \\\n  -H "x-admin-auth: ${T}"`;
  if (body) cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
  cmd += ` \\\n  "${url}"`;
  return cmd;
}

function copyCurl(ep) {
  navigator.clipboard.writeText(ep.curl).then(() => ElMessage.success("cURL tersalin! Ganti YOUR_TOKEN dengan token kamu."));
}

const endpoints = computed(() => [
  // ============ EMAILS ============
  {
    method: "GET", path: "/admin/mails",
    summary: "Ambil daftar email milik satu alamat email.",
    params: [
      { name: "address", type: "string", required: true, default: "-", desc: "Alamat email yang dicek" },
      { name: "limit", type: "number", required: false, default: "20", desc: "Jumlah data, maksimal 100" },
      { name: "offset", type: "number", required: false, default: "0", desc: "Untuk pagination" },
    ],
    resBody: `{
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
// unread: 0 = belum dibaca, 1 = sudah dibaca`,
    curl: curl("GET", "/admin/mails", null, "?address=user@monyet.dev&limit=10"),
  },
  {
    method: "POST", path: "/admin/mails",
    summary: "Buat/inject email manual ke inbox alamat tertentu. Alamat tujuan harus sudah terdaftar.",
    params: [
      { name: "toEmail", type: "string", required: true, default: "-", desc: "Alamat penerima (harus sudah ada)" },
      { name: "subject", type: "string", required: false, default: '""', desc: "Judul email" },
      { name: "text", type: "string", required: false, default: '""', desc: "Isi plain text" },
      { name: "content", type: "string", required: false, default: '""', desc: "Isi HTML" },
      { name: "sendEmail", type: "string", required: false, default: '"admin@system"', desc: "Alamat pengirim" },
      { name: "name", type: "string", required: false, default: '""', desc: "Nama pengirim" },
    ],
    reqBody: `{
  "toEmail": "user@monyet.dev",
  "sendEmail": "notif@monyet.dev",
  "name": "Notifikasi",
  "subject": "Halo",
  "text": "Isi pesan plain text",
  "content": "<p>Isi pesan <b>HTML</b></p>"
}`,
    resBody: `{
  "code": 0,
  "msg": "success",
  "data": { "emailId": 124 }
}`,
    curl: curl("POST", "/admin/mails",
      `{"toEmail":"user@monyet.dev","subject":"Halo","text":"Isi pesan"}`),
  },
  {
    method: "DELETE", path: "/admin/mails",
    summary: "Hapus email. Bisa by ID (beberapa sekaligus) atau hapus semua milik satu alamat.",
    params: [
      { name: "emailIds", type: "string", required: false, default: "-", desc: 'ID email pisah koma. Contoh: "1,2,3"' },
      { name: "address", type: "string", required: false, default: "-", desc: "Hapus SEMUA email milik alamat ini" },
    ],
    reqBody: `// Hapus by ID:
{ "emailIds": "1,2,3" }

// ATAU hapus semua milik satu alamat:
{ "address": "user@monyet.dev" }`,
    resBody: `{
  "code": 0,
  "msg": "success",
  "data": { "deleted": 3 }
  // atau: { "deletedByAddress": "user@monyet.dev" }
}`,
    curl: curl("DELETE", "/admin/mails", `{"emailIds":"1,2,3"}`),
  },
  {
    method: "PUT", path: "/admin/mails/read",
    summary: "Tandai email sudah dibaca atau belum dibaca.",
    params: [
      { name: "emailIds", type: "string", required: true, default: "-", desc: 'ID email pisah koma. Contoh: "1,2,3"' },
      { name: "unread", type: "number", required: false, default: "0", desc: "0 = sudah dibaca, 1 = belum dibaca" },
    ],
    reqBody: `{ "emailIds": "1,2,3", "unread": 0 }`,
    resBody: `{
  "code": 0,
  "msg": "success",
  "data": { "updated": 3, "unread": 0 }
}`,
    curl: curl("PUT", "/admin/mails/read", `{"emailIds":"1,2,3","unread":0}`),
  },
  // ============ ACCOUNTS ============
  {
    method: "GET", path: "/admin/accounts",
    summary: "Lihat daftar alamat mailbox. Bisa filter milik user tertentu.",
    params: [
      { name: "userEmail", type: "string", required: false, default: "-", desc: "Filter hanya milik user ini" },
      { name: "limit", type: "number", required: false, default: "50", desc: "Maksimal 200" },
      { name: "offset", type: "number", required: false, default: "0", desc: "Untuk pagination" },
    ],
    resBody: `{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "accountId": 5,
      "email": "belanja@monyet.dev",
      "name": "belanja",
      "userId": 2,
      "createTime": "2026-10-07 10:00:00"
    }
  ]
}`,
    curl: curl("GET", "/admin/accounts", null, "?userEmail=user@monyet.dev"),
  },
  {
    method: "POST", path: "/admin/accounts",
    summary: "Buat alamat email baru untuk user tertentu. Bypass limit jumlah alamat (seperti dashboard admin). Domain harus terdaftar di sistem.",
    params: [
      { name: "email", type: "string", required: true, default: "-", desc: "Alamat baru, mis. baru@monyet.dev" },
      { name: "userEmail", type: "string", required: false, default: "-", desc: "Email user pemilik (wajib jika userId kosong)" },
      { name: "userId", type: "number", required: false, default: "-", desc: "ID user (alternatif userEmail)" },
    ],
    reqBody: `{
  "email": "baru@monyet.dev",
  "userEmail": "user@monyet.dev"
}`,
    resBody: `{
  "code": 0,
  "msg": "success",
  "data": { "email": "baru@monyet.dev", "accountId": 6 }
}
// Jika alamat pernah dihapus: { "restored": "baru@monyet.dev" }`,
    curl: curl("POST", "/admin/accounts",
      `{"email":"baru@monyet.dev","userEmail":"user@monyet.dev"}`),
  },
  {
    method: "DELETE", path: "/admin/accounts",
    summary: "Hapus alamat mailbox (soft delete, bisa di-restore dengan POST lagi).",
    params: [
      { name: "email", type: "string", required: false, default: "-", desc: "Alamat yang dihapus" },
      { name: "accountId", type: "number", required: false, default: "-", desc: "ID akun (alternatif email)" },
    ],
    reqBody: `{ "email": "hapus@monyet.dev" }`,
    resBody: `{
  "code": 0,
  "msg": "success",
  "data": { "deleted": "hapus@monyet.dev" }
}`,
    curl: curl("DELETE", "/admin/accounts", `{"email":"hapus@monyet.dev"}`),
  },
]);
</script>

<style lang="scss" scoped>
.api-docs {
  max-width: 900px;
  .ad-title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
  .ad-desc { color: var(--el-text-color-secondary); margin: 0 0 16px; line-height: 1.7;
    code { background: var(--el-fill-color-light); padding: 2px 6px; border-radius: 4px; font-size: 12px; } }
  .ad-alert { margin-bottom: 20px; }

  .ad-endpoint {
    border: 1px solid var(--el-border-color); border-radius: 10px;
    padding: 18px; margin-bottom: 18px; background: var(--el-bg-color);
  }
  .ad-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .ad-method {
    font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 5px;
    color: #fff; min-width: 64px; text-align: center;
    &.get { background: #67c23a; }
    &.post { background: #409eff; }
    &.put { background: #e6a23c; }
    &.delete { background: #f56c6c; }
  }
  .ad-path { font-size: 15px; font-weight: 600; }
  .ad-summary { margin: 0 0 4px; color: var(--el-text-color-regular); line-height: 1.6; }
  .ad-block { margin-top: 14px; }
  .ad-label { font-weight: 600; font-size: 13px; margin-bottom: 6px; }
  .ad-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;
    .ad-label { margin-bottom: 0; } }
  .ad-code {
    background: #1e1e2e; color: #cdd6f4;
    border-radius: 8px; padding: 14px; font-size: 12.5px; line-height: 1.65;
    overflow-x: auto; white-space: pre; margin: 0;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  }
  .ad-curl { color: #a6e3a1; }
}
</style>
