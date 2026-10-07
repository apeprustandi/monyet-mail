<template>
  <div class="api-docs">
    <h2 class="ad-title">Dokumentasi API Admin</h2>
    <p class="ad-desc">
      Semua endpoint butuh header <code>x-admin-auth: &lt;Global API Token&gt;</code>.<br>
      Token diatur di <b>System Settings → Integration → Global API Token</b> (generate + enable).<br>
      Base URL: <code>{{ base }}/api</code> — Response: <code>{ "code": 0, "msg": "success", "data": {...} }</code>
    </p>

    <div class="ad-token-bar">
      <span class="ad-token-label">Global API Token:</span>
      <el-input
        v-model="apiToken"
        placeholder="Paste Global API Token di sini untuk Try it out"
        show-password
        clearable
        class="ad-token-input"
      />
      <el-button type="success" size="small" @click="saveToken" :disabled="!apiToken">Simpan</el-button>
    </div>

    <el-collapse v-model="openPanels" class="ad-collapse">
      <el-collapse-item
        v-for="ep in endpoints" :key="ep.method + ep.path"
        :name="ep.method + ep.path"
        class="ad-endpoint"
      >
        <template #title>
          <div class="ad-head">
            <span class="ad-method" :class="ep.method.toLowerCase()">{{ ep.method }}</span>
            <code class="ad-path">/api{{ ep.path }}</code>
          </div>
        </template>
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
        <div class="ad-label">Contoh Request Body</div>
        <pre class="ad-code">{{ ep.reqBody }}</pre>
      </div>

      <div v-if="ep.resBody" class="ad-block">
        <div class="ad-label">Contoh Response</div>
        <pre class="ad-code">{{ ep.resBody }}</pre>
      </div>

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

      <!-- Try it out -->
      <div class="ad-block ad-try">
        <el-button
          size="small" type="warning" plain
          @click="toggleTry(ep)"
        >
          <Icon icon="mingcute:zap-line" width="13" height="13" />
          <span style="margin-left:4px">{{ ep._showTry ? 'Tutup' : 'Try it out' }}</span>
        </el-button>

        <div v-if="ep._showTry" class="ad-try-panel">
          <div v-if="!apiToken" class="ad-try-warn">
            <el-alert type="warning" title="Isi Global API Token di atas dulu" :closable="false" />
          </div>
          <el-form label-width="130px" size="small" class="ad-try-form">
            <el-form-item
              v-for="p in ep.params" :key="p.name"
              :label="p.name"
              :required="p.required"
            >
              <el-input
                v-model="ep._values[p.name]"
                :placeholder="(p.default && p.default !== '-') ? 'default: ' + p.default : p.desc"
                clearable
              />
            </el-form-item>
          </el-form>
          <div class="ad-try-actions">
            <el-button type="primary" size="small" :loading="ep._loading" @click="executeEp(ep)" :disabled="!apiToken">
              Kirim Request
            </el-button>
            <el-tag v-if="ep._status" :type="ep._status < 300 ? 'success' : 'danger'" size="small">
              HTTP {{ ep._status }} · {{ ep._time }}ms
            </el-tag>
          </div>
          <pre v-if="ep._response" class="ad-code ad-response">{{ ep._response }}</pre>
        </div>
      </div>
      </el-collapse-item>
    </el-collapse>

    <el-collapse v-model="openPanels" class="ad-collapse">
      <el-collapse-item name="otp-script" class="ad-endpoint">
        <template #title>
          <div class="ad-head">
            <Icon icon="mingcute:terminal-line" width="18" height="18" />
            <span class="ad-path">Contoh Script: Cek OTP</span>
          </div>
        </template>
      <div class="ad-label-row">
        <span class="ad-label">Bash + Python — ambil kode verifikasi dari email terbaru</span>
        <el-button size="small" type="primary" plain @click="copyText(otpScript)">
          <Icon icon="mingcute:copy-line" width="13" height="13" /><span style="margin-left:4px">Copy</span>
        </el-button>
      </div>
      <pre class="ad-code ad-curl">{{ otpScript }}</pre>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import { ElMessage } from "element-plus";

import { ref } from "vue";

const base = computed(() => window.location.origin);
const openPanels = ref([]);
const apiToken = ref(localStorage.getItem("monyet_admin_token") || "");

function saveToken() {
  localStorage.setItem("monyet_admin_token", apiToken.value);
  ElMessage.success("Token tersimpan di browser ini.");
}

function toggleTry(ep) {
  ep._showTry = !ep._showTry;
  if (ep._showTry && !ep._values) {
    ep._values = {};
    (ep.params || []).forEach(p => {
      ep._values[p.name] = (p.default && p.default !== "-" && p.default !== '""') ? p.default : "";
    });
  }
}

async function executeEp(ep) {
  if (!apiToken.value) {
    ElMessage.warning("Isi Global API Token dulu.");
    return;
  }
  ep._loading = true;
  ep._response = "";
  ep._status = 0;
  const t0 = Date.now();
  try {
    let url = `${base.value}/api${ep.path}`;
    const opts = {
      method: ep.method,
      headers: { "x-admin-auth": apiToken.value },
    };
    const vals = ep._values || {};
    if (ep.method === "GET") {
      const qs = new URLSearchParams();
      Object.keys(vals).forEach(k => { if (vals[k] !== "") qs.append(k, vals[k]); });
      const q = qs.toString();
      if (q) url += "?" + q;
    } else {
      const body = {};
      Object.keys(vals).forEach(k => {
        if (vals[k] === "") return;
        // try to parse numbers
        const param = (ep.params || []).find(p => p.name === k);
        body[k] = (param && param.type === "number" && !isNaN(Number(vals[k]))) ? Number(vals[k]) : vals[k];
      });
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    ep._status = res.status;
    const text = await res.text();
    try {
      ep._response = JSON.stringify(JSON.parse(text), null, 2);
    } catch { ep._response = text; }
  } catch (e) {
    ep._response = "Error: " + e.message;
  } finally {
    ep._time = Date.now() - t0;
    ep._loading = false;
  }
}

function curl(method, path, body, query) {
  let url = `${base.value}/api${path}`;
  if (query) url += query;
  const NL = "\n";
  const BS = "\\";
  let cmd = `curl -X ${method} ${url} ${BS}${NL}`;
  cmd += `  -H "x-admin-auth: token_rahasia_kamu"`;
  if (body) {
    cmd += ` ${BS}${NL}  -H "Content-Type: application/json" ${BS}${NL}`;
    cmd += `  -d '${body}'`;
  }
  return cmd;
}

function copyCurl(ep) {
  navigator.clipboard.writeText(ep.curl).then(() => ElMessage.success("cURL tersalin! Ganti token_rahasia_kamu dengan token kamu."));
}
function copyText(t) {
  navigator.clipboard.writeText(t).then(() => ElMessage.success("Tersalin!"));
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

const endpoints = computed(() => [
  {
    method: "GET", path: "/admin/mails",
    summary: "Ambil daftar email milik satu alamat. Cocok untuk script auto-cek OTP/kode verifikasi.",
    params: [
      { name: "address", type: "string", required: true, default: "-", desc: "Alamat email yang dicek" },
      { name: "limit", type: "number", required: false, default: "20", desc: "Maksimal 100" },
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
    summary: "Hapus email by ID (bisa beberapa sekaligus) atau hapus semua milik satu alamat.",
    params: [
      { name: "emailIds", type: "string", required: false, default: "-", desc: 'ID pisah koma. Contoh: "1,2,3"' },
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
      { name: "emailIds", type: "string", required: true, default: "-", desc: 'ID pisah koma. Contoh: "1,2,3"' },
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
}
// atau pakai userId: { "email": "baru@monyet.dev", "userId": 1 }`,
    resBody: `{
  "code": 0,
  "msg": "success",
  "data": { "email": "baru@monyet.dev", "accountId": 6 }
}
// Jika alamat pernah dihapus (restore):
// { "code": 0, "data": { "restored": "baru@monyet.dev" } }`,
    curl: curl("POST", "/admin/accounts",
      `{"email":"baru@monyet.dev","userEmail":"user@monyet.dev"}`),
  },
  {
    method: "DELETE", path: "/admin/accounts",
    summary: "Hapus alamat mailbox (soft delete — bisa di-restore dengan POST lagi).",
    params: [
      { name: "email", type: "string", required: false, default: "-", desc: "Alamat yang dihapus" },
      { name: "accountId", type: "number", required: false, default: "-", desc: "ID akun (alternatif email)" },
    ],
    reqBody: `// By email:
{ "email": "hapus@monyet.dev" }

// ATAU by ID:
{ "accountId": 5 }`,
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
  max-width: 880px;
  .ad-title { font-size: 20px; font-weight: 700; margin: 0 0 8px; }
  .ad-desc { color: var(--el-text-color-secondary); margin: 0 0 20px; line-height: 1.8;
    code { background: var(--el-fill-color-light); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    b { color: var(--el-text-color-primary); } }
  .ad-collapse { border: none; --el-collapse-header-height: auto; }
  .ad-collapse .el-collapse-item { margin-bottom: 12px; }
  .ad-endpoint {
    border: 1px solid var(--el-border-color); border-radius: 10px;
    background: var(--el-bg-color); overflow: hidden;
  }
  .ad-endpoint .el-collapse-item__header {
    padding: 14px 18px; border-bottom: none;
  }
  .ad-endpoint .el-collapse-item__wrap { border-top: 1px solid var(--el-border-color-light); }
  .ad-endpoint .el-collapse-item__content { padding: 0 18px 18px; }
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
  .ad-token-bar {
    display: flex; align-items: center; gap: 10px;
    border: 1px solid var(--el-border-color); border-radius: 10px;
    padding: 12px 16px; margin-bottom: 20px; background: var(--el-bg-color);
  }
  .ad-token-label { font-weight: 600; font-size: 13px; white-space: nowrap; }
  .ad-token-input { flex: 1; }
  .ad-try { border-top: 1px dashed var(--el-border-color); padding-top: 12px; }
  .ad-try-panel { margin-top: 12px; }
  .ad-try-warn { margin-bottom: 10px; }
  .ad-try-form { margin-top: 4px; }
  .ad-try-actions { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
  .ad-response { margin-top: 8px; max-height: 400px; overflow-y: auto; }
}
</style>
