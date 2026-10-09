<template>
  <div class="access-page">
    <!-- Hero -->
    <div class="hero">
      <div class="hero-icon">
        <Icon icon="mingcute:mail-send-fill" />
      </div>
      <h1 class="hero-title">{{ $t('tempMailbox') }}</h1>
      <p class="hero-desc">{{ $t('tempMailboxDesc') }}</p>
    </div>

    <el-card class="access-card" shadow="never">
      <!-- Form akses / buat email -->
      <div v-if="!mailbox.email" class="access-form">
        <div class="form-section">
          <div class="section-title">{{ $t('accessWithKey') }}</div>
          <el-input
            v-model="accessKey"
            :placeholder="$t('accessKeyPlaceholder')"
            clearable
            size="large"
            @keyup.enter="loadInbox"
          >
            <template #append>
              <el-button type="primary" :loading="loading" @click="loadInbox">
                {{ $t('accessInbox') }}
              </el-button>
            </template>
          </el-input>
        </div>

        <el-divider>{{ $t('or') }}</el-divider>

        <div class="form-section">
          <div class="section-title">{{ $t('createNewEmailTitle') }}</div>
          <div class="email-row">
            <el-input
              v-model="newPrefix"
              :placeholder="$t('emailPrefixPlaceholder')"
              size="large"
              class="email-combined"
              clearable
            >
              <template #append>
                <el-select
                  v-model="newDomain"
                  size="large"
                  class="domain-select-inner"
                  :placeholder="$t('domain')"
                >
                  <el-option v-for="d in domains" :key="d" :label="'@' + d" :value="d" />
                </el-select>
              </template>
            </el-input>
          </div>
          <div v-if="domains.length" class="domain-hint">
            {{ $t('domainsAvailable', { count: domains.length }) }}
          </div>
          <div class="btn-row">
            <el-button
              type="primary"
              size="large"
              :loading="creating"
              class="create-btn"
              @click="createEmail"
            >
              <Icon icon="mingcute:add-fill" class="btn-icon" />
              {{ $t('createTempEmail') }}
            </el-button>
            <el-button size="large" @click="randomEmail">
              <Icon icon="mingcute:refresh-2-line" class="btn-icon" />
              {{ $t('random') }}
            </el-button>
          </div>
        </div>

        <!-- Token baru dibuat — tampilkan sekali -->
        <div v-if="newToken.email" class="token-panel">
          <div class="token-head">
            <span class="token-check">
              <Icon icon="mingcute:check-circle-fill" />
            </span>
            <div>
              <div class="token-title">{{ $t('emailCreated') }}</div>
              <div class="token-email">{{ newToken.email }}</div>
            </div>
          </div>

          <div class="token-warn">
            <Icon icon="mingcute:warning-fill" />
            <span>{{ $t('saveTokenWarning') }}</span>
          </div>

          <div class="field-label">{{ $t('accessKeyLabel') }}</div>
          <el-input v-model="newToken.accessToken" readonly class="token-input">
            <template #append>
              <el-button @click="copyToken">{{ $t('copy') }}</el-button>
            </template>
          </el-input>

          <div class="field-label">{{ $t('yourAccessLink') }}</div>
          <div class="link-box">
            <Icon icon="mingcute:link-2-line" class="link-icon" />
            <span class="link-text">{{ accessUrl }}</span>
            <el-button type="primary" class="copy-link-btn" @click="copyLink">
              <Icon icon="mingcute:copy-2-line" class="btn-icon" />
              {{ $t('copyLink') }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- Inbox -->
      <div v-else class="inbox-view">
        <div class="mailbox-header">
          <div class="mailbox-avatar">{{ mailbox.email.charAt(0).toUpperCase() }}</div>
          <div class="mailbox-meta">
            <div class="mailbox-email">{{ mailbox.email }}</div>
            <div class="mailbox-actions">
              <el-button size="small" @click="loadInbox(true)">
                <Icon icon="mingcute:refresh-2-line" class="btn-icon" />
                {{ $t('refresh') }}
              </el-button>
              <el-button size="small" @click="copyEmail">
                <Icon icon="mingcute:copy-2-line" class="btn-icon" />
                {{ $t('copy') }}
              </el-button>
              <el-button size="small" link @click="resetView">{{ $t('useAnotherKey') }}</el-button>
            </div>
          </div>
          <el-button type="danger" plain class="delete-mailbox-btn" @click="confirmDeleteMailbox">
            <Icon icon="mingcute:delete-2-line" class="btn-icon" />
            {{ $t('deleteThisMailbox') }}
          </el-button>
        </div>

        <el-table
          :data="emails"
          v-loading="loading"
          class="inbox-table"
          @row-click="viewEmail"
        >
          <el-table-column prop="sendEmail" :label="$t('from')" min-width="160" show-overflow-tooltip />
          <el-table-column prop="subject" :label="$t('subject')" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="{ unread: !row.isRead }">{{ row.subject || $t('noSubject') }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" :label="$t('time')" width="160" />
          <el-table-column :label="$t('action')" width="80" align="center">
            <template #default="{ row }">
              <el-button type="danger" size="small" link @click.stop="deleteOne(row.emailId)">
                {{ $t('delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!emails.length && !loading" :description="$t('noEmails')" />

        <!-- Detail email -->
        <el-dialog
          v-model="detailVisible"
          :title="detail.subject || $t('noSubject')"
          width="min(720px, 94%)"
          top="5vh"
          class="email-dialog"
        >
          <div class="email-meta">
            <div><strong>{{ $t('from') }}:</strong> {{ detail.sendEmail }}</div>
            <div><strong>{{ $t('time') }}:</strong> {{ detail.createTime }}</div>
          </div>
          <el-divider />
          <div v-if="detail.text && !detail.content" class="email-text">{{ detail.text }}</div>
          <div v-else v-html="detail.content" class="email-html"></div>
        </el-dialog>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Icon } from '@iconify/vue';
import {
  createTempEmail, accessInbox, accessContent,
  deleteEmailByToken, deleteMailboxByToken
} from '@/request/public.js';
import { websiteConfig } from '@/request/setting.js';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const accessKey = ref('');
const loading = ref(false);
const creating = ref(false);
const mailbox = ref({});
const emails = ref([]);
const domains = ref([]);
const newPrefix = ref('');
const newDomain = ref('');
const newToken = ref({});
const detailVisible = ref(false);
const detail = ref({});

const accessUrl = computed(() => {
  return `${window.location.origin}/access?key=${newToken.value.accessToken}`;
});

async function loadDomains() {
  try {
    const setting = await websiteConfig();
    // domainList berformat ['@racun.dev', ...] -> ambil tanpa @
    domains.value = (setting.domainList || []).map(d => d.replace(/^@/, ''));
    if (domains.value.length && !newDomain.value) {
      newDomain.value = domains.value[0];
    }
  } catch (e) {
    console.error(e);
  }
}

function randomEmail() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 10; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  newPrefix.value = s;
}

async function createEmail() {
  if (!newPrefix.value || !newDomain.value) {
    ElMessage.warning(t('fillEmailAndDomain'));
    return;
  }
  creating.value = true;
  try {
    const data = await createTempEmail(`${newPrefix.value}@${newDomain.value}`);
    newToken.value = data;
    // Langsung muat inbox dengan token baru
    accessKey.value = data.accessToken;
    await loadInbox();
  } catch (e) {
    console.error(e);
  } finally {
    creating.value = false;
  }
}

async function loadInbox(silent = false) {
  const key = accessKey.value.trim();
  if (!key) {
    if (!silent) ElMessage.warning(t('accessKeyPlaceholder'));
    return;
  }
  loading.value = true;
  try {
    const data = await accessInbox(key);
    mailbox.value = { email: data.email };
    emails.value = data.list || [];
    // Update URL tanpa reload
    router.replace({ path: '/access', query: { key } });
  } catch (e) {
    mailbox.value = {};
    emails.value = [];
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function viewEmail(row) {
  try {
    const data = await accessContent(accessKey.value.trim(), row.emailId);
    detail.value = { ...row, ...data };
    detailVisible.value = true;
  } catch (e) {
    console.error(e);
  }
}

async function deleteOne(emailId) {
  try {
    await ElMessageBox.confirm(t('confirmDeleteEmail'), t('confirm'), {
      confirmButtonText: t('delete'),
      cancelButtonText: t('cancel'),
      type: 'warning'
    });
    await deleteEmailByToken(accessKey.value.trim(), String(emailId));
    ElMessage.success(t('deleted'));
    emails.value = emails.value.filter(e => e.emailId !== emailId);
  } catch (e) {
    if (e !== 'cancel') console.error(e);
  }
}

function confirmDeleteMailbox() {
  ElMessageBox.confirm(
    t('confirmDeleteMailboxDetail', { email: mailbox.value.email }),
    t('confirmDeleteMailboxTitle'),
    {
      confirmButtonText: t('deleteThisMailbox'),
      cancelButtonText: t('cancel'),
      type: 'error',
      dangerouslyUseHTMLString: true
    }
  ).then(async () => {
    try {
      await deleteMailboxByToken(accessKey.value.trim());
      ElMessage.success(t('mailboxDeleted'));
      resetView();
    } catch (e) {
      console.error(e);
    }
  }).catch(() => {});
}

function resetView() {
  mailbox.value = {};
  emails.value = [];
  accessKey.value = '';
  newToken.value = {};
  router.replace({ path: '/access' });
}

function copyEmail() {
  navigator.clipboard.writeText(mailbox.value.email);
  ElMessage.success(t('copied'));
}

function copyToken() {
  navigator.clipboard.writeText(newToken.value.accessToken);
  ElMessage.success(t('copied'));
}

function copyLink() {
  navigator.clipboard.writeText(accessUrl.value);
  ElMessage.success(t('copied'));
}

onMounted(async () => {
  await loadDomains();
  const key = route.query.key;
  if (key) {
    accessKey.value = key;
    await loadInbox(true);
  }
});
</script>

<style scoped lang="scss">
.access-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 28px 16px 48px;
  min-height: 80vh;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* ---------- Hero ---------- */
.hero {
  width: 100%;
  text-align: center;
  padding: 44px 24px 40px;
  border-radius: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 12px 32px rgba(102, 126, 234, 0.35);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -60px;
    right: -60px;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
  }
  &::after {
    content: '';
    position: absolute;
    bottom: -80px;
    left: -40px;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
  }
}
.hero-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
  font-size: 38px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}
.hero-title {
  margin: 0 0 8px;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.3px;
  position: relative;
  z-index: 1;
}
.hero-desc {
  margin: 0;
  font-size: 15px;
  opacity: 0.92;
  max-width: 520px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
  position: relative;
  z-index: 1;
}

/* ---------- Card ---------- */
.access-card {
  width: 100%;
  border-radius: 20px;
  border: 1px solid #eef0f6;
  box-shadow: 0 8px 28px rgba(30, 40, 90, 0.08);

  :deep(.el-card__body) {
    padding: 28px;
  }
}

/* ---------- Form ---------- */
.access-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.email-row {
  display: flex;
}
.email-combined {
  flex: 1;
  min-width: 0;
}
/* Select di dalam append slot: hilangkan border kiri agar menyatu */
.email-combined .el-input-group__append {
  padding: 0;
  background: #f5f7fa;
}
.domain-select-inner {
  width: 180px;
}
.domain-select-inner .el-input__wrapper {
  box-shadow: none !important;
  background: transparent;
}
.domain-hint {
  font-size: 12px;
  color: #909399;
}
.btn-row {
  display: flex;
  gap: 10px;
  margin-top: 2px;
}
.create-btn {
  flex: 1;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-weight: 600;
  letter-spacing: 0.3px;
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.35);

  &:hover {
    background: linear-gradient(135deg, #5a6fd6 0%, #6a3f96 100%);
  }
}
.btn-icon {
  font-size: 16px;
  margin-right: 2px;
}

/* ---------- Token panel ---------- */
.token-panel {
  margin-top: 16px;
  padding: 20px;
  border-radius: 16px;
  background: #f0f9f4;
  border: 1px solid #bfe6cd;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.token-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.token-check {
  font-size: 34px;
  color: #22a355;
  display: inline-flex;
}
.token-title {
  font-size: 15px;
  font-weight: 700;
  color: #1d7a3f;
}
.token-email {
  font-size: 17px;
  font-weight: 700;
  color: #303133;
  word-break: break-all;
}
.token-warn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #b7791f;
  background: #fef6e7;
  border: 1px solid #f5dfae;
  border-radius: 10px;
  padding: 10px 12px;
}
.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: -6px;
}
.token-input {
  :deep(.el-input__inner) {
    font-family: monospace;
    font-size: 13px;
  }
}
.link-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #eef2ff;
  border: 1.5px dashed #667eea;
  border-radius: 12px;
  padding: 10px 10px 10px 14px;
}
.link-icon {
  font-size: 20px;
  color: #667eea;
  flex-shrink: 0;
}
.link-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #4a5a9e;
  word-break: break-all;
  font-family: monospace;
}
.copy-link-btn {
  flex-shrink: 0;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-weight: 600;

  &:hover {
    background: linear-gradient(135deg, #5a6fd6 0%, #6a3f96 100%);
  }
}

/* ---------- Inbox ---------- */
.inbox-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.mailbox-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f5f7ff 0%, #faf5ff 100%);
  border: 1px solid #e8ecf8;
}
.mailbox-avatar {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
}
.mailbox-meta {
  flex: 1;
  min-width: 0;
}
.mailbox-email {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  word-break: break-all;
  margin-bottom: 8px;
}
.mailbox-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.delete-mailbox-btn {
  flex-shrink: 0;
  font-weight: 600;
}
.inbox-table {
  border-radius: 12px;
  overflow: hidden;

  :deep(.el-table__row) {
    cursor: pointer;
  }
}
.unread {
  font-weight: 700;
}
.email-meta {
  font-size: 13px;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.email-text {
  white-space: pre-wrap;
}
.email-html {
  overflow: auto;
}

/* ---------- Responsive ---------- */
@media (max-width: 640px) {
  .access-page {
    padding: 16px 10px 36px;
  }
  .hero {
    padding: 32px 18px 28px;
    border-radius: 18px;
  }
  .hero-title {
    font-size: 24px;
  }
  .hero-desc {
    font-size: 13.5px;
  }
  .access-card {
    :deep(.el-card__body) {
      padding: 18px 16px;
    }
  }
  /* Mobile: input + domain tetap 1 baris, domain menyempit */
  .email-row {
    flex-direction: row;
  }
  .email-combined {
    min-width: 0;
  }
  .domain-select-inner {
    width: 118px;
  }
  .domain-select-inner .el-input__inner {
    font-size: 12px;
    padding: 0 4px;
  }
  .btn-row {
    flex-direction: column;
  }
  .create-btn {
    width: 100%;
  }
  .mailbox-header {
    flex-wrap: wrap;
  }
  .delete-mailbox-btn {
    width: 100%;
  }
  .link-box {
    flex-wrap: wrap;
  }
  .link-text {
    flex-basis: 100%;
  }
  .copy-link-btn {
    width: 100%;
  }
}
</style>
