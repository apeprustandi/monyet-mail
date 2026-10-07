<template>
  <div class="api-docs">
    <h2 class="ad-title">Dokumentasi API</h2>
    <p class="ad-desc">Endpoint API admin — akses dengan header <code>x-admin-auth: &lt;Global API Token&gt;</code></p>

    <!-- Token info -->
    <el-alert
      title="Butuh Global API Token"
      type="warning"
      description="Aktifkan di System Settings → Integration → Global API Token, lalu kirim via header: x-admin-auth: <token>"
      show-icon
      :closable="false"
      class="ad-alert"
    />

    <div v-for="ep in endpoints" :key="ep.method + ep.path" class="ad-endpoint">
      <div class="ad-head">
        <span class="ad-method" :class="ep.method.toLowerCase()">{{ ep.method }}</span>
        <code class="ad-path">/api{{ ep.path }}</code>
        <el-button size="small" @click="copyUrl(ep)" class="ad-copy">
          <Icon icon="mingcute:copy-line" width="14" height="14" />
        </el-button>
      </div>
      <p class="ad-summary">{{ ep.summary }}</p>

      <div v-if="ep.params" class="ad-block">
        <div class="ad-label">{{ ep.method === 'GET' ? 'Query Params' : 'Body (JSON)' }}</div>
        <el-table :data="ep.params" size="small" border>
          <el-table-column prop="name" label="Nama" width="140" />
          <el-table-column prop="type" label="Tipe" width="90" />
          <el-table-column prop="required" label="Wajib" width="70">
            <template #default="scope">
              <el-tag :type="scope.row.required ? 'danger' : 'info'" size="small">
                {{ scope.row.required ? 'Ya' : 'Tidak' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="desc" label="Keterangan" />
        </el-table>
      </div>

      <div v-if="ep.example" class="ad-block">
        <div class="ad-label">Contoh</div>
        <pre class="ad-code">{{ ep.example }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import { ElMessage } from "element-plus";

const baseUrl = computed(() => window.location.origin);

function curlExample(method, path, body) {
  let cmd = `curl -X ${method} -H "x-admin-auth: TOKEN"`;
  if (body) cmd += ` -H "Content-Type: application/json" -d '${body}'`;
  cmd += ` "${baseUrl.value}/api${path}"`;
  return cmd;
}

const endpoints = computed(() => [
  {
    method: "GET", path: "/admin/mails",
    summary: 'Lihat daftar email milik alamat tertentu.',
    params: [
      { name: "address", type: "string", required: true, desc: 'Alamat email target' },
      { name: "limit", type: "number", required: false, desc: "Default 20, max 100" },
      { name: "offset", type: "number", required: false, desc: "Default 0" },
    ],
    example: curlExample("GET", "/admin/mails?address=user@monyet.dev&limit=10"),
  },
  {
    method: "POST", path: "/admin/mails",
    summary: 'Buat/inject email manual ke inbox alamat tertentu.',
    params: [
      { name: "toEmail", type: "string", required: true, desc: 'Alamat email target' },
      { name: "subject", type: "string", required: false, desc: 'Judul email' },
      { name: "text", type: "string", required: false, desc: 'Isi plain text' },
      { name: "content", type: "string", required: false, desc: 'Isi HTML' },
      { name: "sendEmail", type: "string", required: false, desc: 'Pengirim (default: admin@system)' },
    ],
    example: curlExample("POST", "/admin/mails",
      `{"toEmail":"user@monyet.dev","subject":"Halo","text":"Isi pesan"}`),
  },
  {
    method: "DELETE", path: "/admin/mails",
    summary: 'Hapus email by ID, atau hapus semua milik satu alamat.',
    params: [
      { name: "emailIds", type: "string", required: false, desc: 'ID email, pisah koma. Contoh: 1,2,3' },
      { name: "address", type: "string", required: false, desc: 'Hapus semua email milik alamat ini' },
    ],
    example: curlExample("DELETE", "/admin/mails", `{"emailIds":"1,2,3"}`),
  },
  {
    method: "PUT", path: "/admin/mails/read",
    summary: 'Tandai email sudah dibaca / belum dibaca.',
    params: [
      { name: "emailIds", type: "string", required: true, desc: 'ID email, pisah koma. Contoh: 1,2,3' },
      { name: "unread", type: "number", required: false, desc: '0 = sudah dibaca, 1 = belum dibaca' },
    ],
    example: curlExample("PUT", "/admin/mails/read", `{"emailIds":"1,2,3","unread":0}`),
  },
  {
    method: "GET", path: "/admin/accounts",
    summary: 'Lihat daftar alamat mailbox, bisa filter per user.',
    params: [
      { name: "userEmail", type: "string", required: false, desc: 'Email user pemilik' },
      { name: "limit", type: "number", required: false, desc: "Default 50, max 200" },
      { name: "offset", type: "number", required: false, desc: "Default 0" },
    ],
    example: curlExample("GET", "/admin/accounts?userEmail=user@monyet.dev"),
  },
  {
    method: "POST", path: "/admin/accounts",
    summary: 'Buat alamat email baru untuk user tertentu (bypass limit).',
    params: [
      { name: "email", type: "string", required: true, desc: 'Alamat email baru yang dibuat' },
      { name: "userEmail", type: "string", required: false, desc: 'Email user pemilik' },
      { name: "userId", type: "number", required: false, desc: 'ID user (alternatif userEmail)' },
    ],
    example: curlExample("POST", "/admin/accounts",
      `{"email":"baru@monyet.dev","userEmail":"user@monyet.dev"}`),
  },
  {
    method: "DELETE", path: "/admin/accounts",
    summary: 'Hapus alamat mailbox.',
    params: [
      { name: "email", type: "string", required: false, desc: 'Alamat email target' },
      { name: "accountId", type: "number", required: false, desc: 'ID akun mailbox' },
    ],
    example: curlExample("DELETE", "/admin/accounts", `{"email":"hapus@monyet.dev"}`),
  },
]);

function copyUrl(ep) {
  const url = `${baseUrl.value}/api${ep.path}`;
  navigator.clipboard.writeText(url).then(() => {
    ElMessage.success('URL tersalin!');
  });
}
</script>

<style lang="scss" scoped>
.api-docs {
  .ad-title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
  .ad-desc { color: var(--el-text-color-secondary); margin: 0 0 16px; }
  .ad-alert { margin-bottom: 20px; }

  .ad-endpoint {
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    background: var(--el-bg-color);
  }
  .ad-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .ad-method {
    font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 4px;
    color: #fff; min-width: 62px; text-align: center;
    &.get { background: #67c23a; }
    &.post { background: #409eff; }
    &.put { background: #e6a23c; }
    &.delete { background: #f56c6c; }
  }
  .ad-path { font-size: 14px; font-weight: 600; flex: 1; }
  .ad-summary { margin: 0 0 12px; color: var(--el-text-color-regular); }
  .ad-block { margin-top: 12px; }
  .ad-label { font-weight: 600; font-size: 13px; margin-bottom: 6px; }
  .ad-code {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color);
    border-radius: 6px; padding: 12px;
    font-size: 12px; overflow-x: auto; white-space: pre-wrap;
    word-break: break-all; margin: 0;
  }
}
</style>
