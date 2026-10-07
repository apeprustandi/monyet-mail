import app from '../hono/hono';
import result from '../model/result';
import KvConst from '../const/kv-const';
import orm from '../entity/orm';
import email from '../entity/email';
import BizError from '../error/biz-error';
import { and, eq, desc, count, inArray } from 'drizzle-orm';
import { isDel, emailConst } from '../const/entity-const';
import accountService from '../service/account-service';
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
 * GET /admin/users
 * List users (admin only).
 * Header: x-admin-auth: <token>
 * Query: limit (default 20, max 100), offset (default 0), keyword (optional)
 */
app.get('/admin/users', async (c) => {
	await verifyAdminToken(c);

	let { limit = '20', offset = '0', keyword = '' } = c.req.query();
	limit  = Math.min(Number(limit)  || 20, 100);
	offset = Math.max(Number(offset) || 0,  0);

	const data = await userService.list(c, { num: Math.floor(offset/limit)+1, size: limit, email: keyword });
	return c.json(result.ok(data));
});

/**
 * POST /api/admin/users
 * Add a new user (admin only). Creates user + mailbox account.
 * Header: x-admin-auth: <token>
 * Body: { email (required), password (required, min 6), roleId (optional) }
 */
app.post('/admin/users', async (c) => {
	await verifyAdminToken(c);
	const params = await c.req.json();

	if (!params.email || !params.password) {
		throw new BizError('email dan password wajib diisi', 400);
	}

	await userService.add(c, params);
	return c.json(result.ok());
});

/**
 * DELETE /api/admin/users
 * Delete user(s) by email or userIds (admin only).
 * Header: x-admin-auth: <token>
 * Body: { email: "user@monyet.dev" } OR { userIds: [1,2] }
 */
app.delete('/admin/users', async (c) => {
	await verifyAdminToken(c);
	const { email: delEmail, userIds } = await c.req.json();

	if (delEmail) {
		const userRow = await userService.selectByEmail(c, delEmail);
		if (!userRow) {
			throw new BizError('User not found: ' + delEmail, 404);
		}
		await userService.delete(c, userRow.userId);
		return c.json(result.ok({ deleted: delEmail }));
	}

	if (userIds && userIds.length) {
		for (const uid of userIds) {
			await userService.delete(c, uid);
		}
		return c.json(result.ok({ deleted: userIds.length }));
	}

	throw new BizError('email atau userIds wajib diisi', 400);
});
