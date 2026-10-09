<template>
  <div class="access-page">
    <el-card class="access-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('tempMailbox') }}</span>
          <el-button v-if="mailbox.email" type="danger" size="small" @click="confirmDeleteMailbox">
            {{ $t('deleteMailbox') }}
          </el-button>
        </div>
      </template>

      <!-- Form akses via key -->
      <div v-if="!mailbox.email" class="access-form">
        <el-input
          v-model="accessKey"
          :placeholder="$t('accessKeyPlaceholder')"
          clearable
          @keyup.enter="loadInbox"
        >
          <template #append>
            <el-button type="primary" :loading="loading" @click="loadInbox">
              {{ $t('accessInbox') }}
            </el-button>
          </template>
        </el-input>

        <el-divider>{{ $t('or') }}</el-divider>

        <!-- Buat email sementara baru -->
        <div class="create-form">
          <div class="email-row">
            <el-input v-model="newPrefix" :placeholder="$t('emailPrefixPlaceholder')" class="prefix-input">
              <template #append>
                <el-select v-model="newDomain" class="domain-select">
                  <el-option v-for="d in domains" :key="d" :label="'@' + d" :value="d" />
                </el-select>
              </template>
            </el-input>
          </div>
          <el-button type="success" :loading="creating" @click="createEmail" class="create-btn">
            {{ $t('createTempEmail') }}
          </el-button>
          <el-button link @click="randomEmail">{{ $t('random') }}</el-button>
        </div>

        <!-- Token baru dibuat — tampilkan sekali -->
        <el-alert
          v-if="newToken.email"
          :title="$t('saveTokenWarning')"
          type="warning"
          :closable="false"
          show-icon
          class="token-alert"
        >
          <div class="token-box">
            <div><strong>{{ newToken.email }}</strong></div>
            <div class="token-row">
              <el-input v-model="newToken.accessToken" readonly>
                <template #append>
                  <el-button @click="copyToken">{{ $t('copy') }}</el-button>
                </template>
              </el-input>
            </div>
            <div class="token-link">
              {{ $t('accessLink') }}:
              <a :href="accessUrl" target="_blank">{{ accessUrl }}</a>
            </div>
          </div>
        </el-alert>
      </div>

      <!-- Inbox -->
      <div v-else class="inbox-view">
        <div class="mailbox-info">
          <el-tag type="success" size="large">{{ mailbox.email }}</el-tag>
          <el-button size="small" @click="loadInbox(true)">{{ $t('refresh') }}</el-button>
          <el-button size="small" @click="copyEmail">{{ $t('copy') }}</el-button>
          <el-button size="small" link @click="resetView">{{ $t('useAnotherKey') }}</el-button>
        </div>

        <el-table :data="emails" v-loading="loading" style="width: 100%" @row-click="viewEmail">
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
        <el-dialog v-model="detailVisible" :title="detail.subject || $t('noSubject')" width="90%" top="5vh">
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
  ElMessageBox.confirm(t('confirmDeleteMailbox'), t('deleteMailbox'), {
    confirmButtonText: t('delete'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(async () => {
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
  justify-content: center;
  padding: 24px 12px;
  min-height: 80vh;
}
.access-card {
  width: 100%;
  max-width: 900px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.access-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.create-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.email-row {
  display: flex;
}
.create-btn {
  align-self: flex-start;
}
.token-alert {
  margin-top: 8px;
}
.token-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.token-link {
  word-break: break-all;
  font-size: 12px;
}
.mailbox-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
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
</style>
