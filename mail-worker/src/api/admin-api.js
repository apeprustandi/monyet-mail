import app from '../hono/hono';
import result from '../model/result';
import KvConst from '../const/kv-const';
import orm from '../entity/orm';
import email from '../entity/email';
import BizError from '../error/biz-error';
import { and, eq, desc, count, inArray } from 'drizzle-orm';
import { isDel, emailConst } from '../const/entity-const';
import accountService from '../service/account-service';
import settingService from '../service/setting-service';
import account from '../entity/account';
import userService from '../service/user-service';

/** Verify x-admin-auth header against stored global token */
async function verifyAdminToken(c) {
	const enabled = await c.env.kv.get(KvConst.GLOBAL_TOKEN_ENABLED);
	if (enabled !== '1') {
		throw new BizError('Global Token 未启用', 403);
	}
	const storedToken = await c.env.kv.get(KvConst.GLOBAL_TOKEN);
	if (!storedToken) {
		throw new BizError('Global Token 未配置', 403);
	}
	const headerToken = c.req.header('x-admin-auth');
	if (!headerToken || headerToken !== storedToken) {
		throw new BizError('Token 验证失败', 401);
	}
}

/**
 * GET /admin/mails
 * Query params: limit (default 20), offset (default 0), address (required)
 * Header: x-admin-auth: <token>
 */
app.get('/admin/mails', async (c) => {
	await verifyAdminToken(c);

	let { limit = '20', offset = '0', address } = c.req.query();
	limit  = Math.min(Number(limit)  || 20, 100);
	offset = Math.max(Number(offset) || 0,  0);

	if (!address) {
		throw new BizError('address 参数必填', 400);
	}

	const db = orm(c);

	const [rows, countRow] = await Promise.all([
		db.select({
			emailId:   email.emailId,
			messageId: email.messageId,
			sendEmail: email.sendEmail,
			name:      email.name,
			toEmail:   email.toEmail,
			subject:   email.subject,
			text:      email.text,
			content:   email.content,
			createTime:email.createTime,
			unread:    email.unread,
			type:      email.type,
		})
		.from(email)
		.where(and(
			eq(email.toEmail, address),
			eq(email.isDel, isDel.NORMAL),
		))
		.orderBy(desc(email.emailId))
		.limit(limit)
		.offset(offset),

		db.select({ total: count() })
		.from(email)
		.where(and(
			eq(email.toEmail, address),
			eq(email.isDel, isDel.NORMAL),
		))
		.get(),
	]);

	return c.json({
		results: rows,
		count: countRow?.total ?? 0,
	});
});

/**
 * POST /admin/mails
 * Inject/create an email message into an address inbox (admin only).
 * Header: x-admin-auth: <token>
 * Body: { toEmail (required), sendEmail, name, subject, text, content }
 */
app.post('/admin/mails', async (c) => {
	await verifyAdminToken(c);
	const { toEmail, sendEmail = 'admin@system', name = '', subject = '', text = '', content = '' } = await c.req.json();

	if (!toEmail) {
		throw new BizError('toEmail 参数必填', 400);
	}

	// Find the mailbox account for this address
	const account = await accountService.selectByEmailIncludeDel(c, toEmail);
	if (!account || account.isDel === isDel.DELETE) {
		throw new BizError('Recipient address not found: ' + toEmail, 404);
	}

	const db = orm(c);
	const inserted = await db.insert(email).values({
		sendEmail,
		name,
		accountId: account.accountId,
		userId: account.userId,
		subject,
		text,
		content,
		toEmail,
		toName: account.name || '',
		unread: 0, // 0=unread, 1=read
		isDel: isDel.NORMAL,
	}).returning({ emailId: email.emailId });

	return c.json(result.ok({ emailId: inserted[0]?.emailId }));
});

/**
 * DELETE /admin/mails
 * Delete emails by emailIds (comma-separated) or by address (all).
 * Header: x-admin-auth: <token>
 * Body: { emailIds: "1,2,3" } OR { address: "user@monyet.dev" }
 */
app.delete('/admin/mails', async (c) => {
	await verifyAdminToken(c);
	const { emailIds, address } = await c.req.json();
	const db = orm(c);

	if (emailIds) {
		const ids = String(emailIds).split(',').map(Number).filter(n => n > 0);
		if (!ids.length) throw new BizError('emailIds invalid', 400);
		await db.update(email).set({ isDel: isDel.DELETE }).where(inArray(email.emailId, ids));
		return c.json(result.ok({ deleted: ids.length }));
	}

	if (address) {
		await db.update(email).set({ isDel: isDel.DELETE })
			.where(and(eq(email.toEmail, address), eq(email.isDel, isDel.NORMAL)));
		return c.json(result.ok({ deletedByAddress: address }));
	}

	throw new BizError('emailIds atau address wajib diisi', 400);
});

/**
 * PUT /admin/mails/read
 * Mark emails as read/unread.
 * Header: x-admin-auth: <token>
 * Body: { emailIds: "1,2,3", unread: 0 }  (unread: 0=read, 1=unread)
 */
app.put('/admin/mails/read', async (c) => {
	await verifyAdminToken(c);
	const { emailIds, unread = 0 } = await c.req.json();

	if (!emailIds) {
		throw new BizError('emailIds 参数必填', 400);
	}

	const ids = String(emailIds).split(',').map(Number).filter(n => n > 0);
	if (!ids.length) throw new BizError('emailIds invalid', 400);

	const db = orm(c);
	await db.update(email)
		.set({ unread: unread ? 0 : 1 })
		.where(inArray(email.emailId, ids));

	return c.json(result.ok({ updated: ids.length, unread: unread ? 1 : 0 }));
});

/**
 * GET /admin/accounts
 * List mailbox addresses (admin only). Filter by user email optional.
 * Header: x-admin-auth: <token>
 * Query: userEmail (optional), limit (default 50, max 200), offset (default 0)
 */
app.get('/admin/accounts', async (c) => {
	await verifyAdminToken(c);

	let { userEmail = '', limit = '50', offset = '0' } = c.req.query();
	limit  = Math.min(Number(limit)  || 50, 200);
	offset = Math.max(Number(offset) || 0,  0);

	const db = orm(c);
	let query = db.select({
		accountId: account.accountId,
		email: account.email,
		name: account.name,
		userId: account.userId,
		createTime: account.createTime,
	}).from(account).where(eq(account.isDel, isDel.NORMAL));

	if (userEmail) {
		const userRow = await userService.selectByEmail(c, userEmail);
		if (!userRow) throw new BizError('User not found: ' + userEmail, 404);
		query = query.where(eq(account.userId, userRow.userId));
	}

	const rows = await query.orderBy(desc(account.accountId)).limit(limit).offset(offset).all();
	return c.json(result.ok(rows));
});

/**
 * POST /admin/accounts
 * Create a new mailbox address for a user (admin only, bypasses limits).
 * Header: x-admin-auth: <token>
 * Body: { email: "baru@monyet.dev" (required), userEmail: "user@monyet.dev" (required) }
 */
app.post('/admin/accounts', async (c) => {
	await verifyAdminToken(c);
	const { email, userEmail, userId } = await c.req.json();

	if (!email) throw new BizError('email wajib diisi', 400);
	if (!userEmail && !userId) throw new BizError('userEmail atau userId wajib diisi', 400);

	// Resolve target user
	let targetUserId = userId;
	if (!targetUserId) {
		const userRow = await userService.selectByEmail(c, userEmail);
		if (!userRow) throw new BizError('User not found: ' + userEmail, 404);
		targetUserId = userRow.userId;
	}

	// Validate domain
	const setting = await settingService.query(c);
	const { domainList } = setting;
	const emailDomain = email.split('@')[1] || '';
	if (!domainList.includes('@' + emailDomain)) {
		throw new BizError('Domain tidak terdaftar: ' + emailDomain, 400);
	}

	// Check duplicate
	const existing = await accountService.selectByEmailIncludeDel(c, email);
	if (existing && existing.isDel === isDel.DELETE) {
		// Restore soft-deleted
		const db = orm(c);
		await db.update(account)
			.set({ isDel: isDel.NORMAL, userId: targetUserId })
			.where(eq(account.email, email)).run();
		return c.json(result.ok({ restored: email }));
	}
	if (existing) throw new BizError('Alamat sudah dipakai: ' + email, 400);

	// Create
	await accountService.insert(c, {
		userId: targetUserId,
		email,
		name: email.split('@')[0],
	});
	const created = await accountService.selectByEmailIncludeDel(c, email);
	return c.json(result.ok({ email, accountId: created?.accountId }));
});

/**
 * DELETE /admin/accounts
 * Delete a mailbox address (admin only).
 * Header: x-admin-auth: <token>
 * Body: { email: "hapus@monyet.dev" } OR { accountId: 1 }
 */
app.delete('/admin/accounts', async (c) => {
	await verifyAdminToken(c);
	const { email: delEmail, accountId } = await c.req.json();
	const db = orm(c);

	if (delEmail) {
		await db.update(account).set({ isDel: isDel.DELETE }).where(eq(account.email, delEmail)).run();
		return c.json(result.ok({ deleted: delEmail }));
	}
	if (accountId) {
		await db.update(account).set({ isDel: isDel.DELETE }).where(eq(account.accountId, Number(accountId))).run();
		return c.json(result.ok({ deletedAccountId: accountId }));
	}
	throw new BizError('email atau accountId wajib diisi', 400);
});
