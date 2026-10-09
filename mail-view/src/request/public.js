import http from '@/axios/index.js'

// Buat email sementara tanpa login — kembalikan { email, accessToken }
// Token hanya ditampilkan sekali, user wajib menyimpannya
export function createTempEmail(email) {
    return http.post('/public/createTempEmail', { email })
}

// Akses inbox via access token (tanpa login)
export function accessInbox(key, params = {}) {
    return http.post('/public/accessInbox', { key, ...params })
}

// Ambil konten satu email via access token
export function accessContent(key, emailId) {
    return http.get('/public/accessContent', { params: { key, emailId } })
}

// Hapus email via access token (soft delete)
export function deleteEmailByToken(key, emailIds) {
    return http.post('/public/deleteEmail', { key, emailIds })
}

// Hapus seluruh mailbox via access token (soft delete)
export function deleteMailboxByToken(key) {
    return http.post('/public/deleteMailbox', { key })
}
