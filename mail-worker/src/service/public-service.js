import BizError from '../error/biz-error';
import orm from '../entity/orm';
import { v4 as uuidv4 } from 'uuid';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import saltHashUtils from '../utils/crypto-utils';
import cryptoUtils from '../utils/crypto-utils';
import emailUtils from '../utils/email-utils';
import roleService from './role-service';
import verifyUtils from '../utils/verify-utils';
import { t } from '../i18n/i18n';
import settingService from './setting-service';
import reqUtils from '../utils/req-utils';
import dayjs from 'dayjs';
import { isDel, roleConst, settingConst } from '../const/entity-const';
import email from '../entity/email';
import account from '../entity/account';
import userService from './user-service';
import accountService from './account-service';
import emailService from './email-service';
import KvConst from '../const/kv-const';

const publicService = {

	async emailList(c, params) {

		let { toEmail, content, subject, sendName, sendEmail, timeSort, num, size, type , isDel } = params

		const query = orm(c).select({
				emailId: email.emailId,
				sendEmail: email.sendEmail,
				sendName: email.name,
				subject: email.subject,
				toEmail: email.toEmail,
				toName: email.toName,
				type: email.type,
				createTime: email.createTime,
				content: email.content,
				text: email.text,
				isDel: email.isDel,
		}).from(email)

		if (!size) {
			size = 20
		}

		if (!num) {
			num = 1
		}

		size = Number(size);
		num = Number(num);

		num = (num - 1) * size;

		let conditions = []

		if (toEmail) {
			conditions.push(sql`${email.toEmail} COLLATE NOCASE LIKE ${toEmail}`)
		}

		if (sendEmail) {
			conditions.push(sql`${email.sendEmail} COLLATE NOCASE LIKE ${sendEmail}`)
		}

		if (sendName) {
			conditions.push(sql`${email.name} COLLATE NOCASE LIKE ${sendName}`)
		}

		if (subject) {
			conditions.push(sql`${email.subject} COLLATE NOCASE LIKE ${subject}`)
		}

		if (content) {
			conditions.push(sql`${email.content} COLLATE NOCASE LIKE ${content}`)
		}

		if (type || type === 0) {
			conditions.push(eq(email.type, type))
		}

		if (isDel || isDel === 0) {
			conditions.push(eq(email.isDel, isDel))
		}

		if (conditions.length === 1) {
			query.where(...conditions)
		} else if (conditions.length > 1) {
			query.where(and(...conditions))
		}

		if (timeSort === 'asc') {
			query.orderBy(asc(email.emailId));
		} else {
			query.orderBy(desc(email.emailId));
		}

		return query.limit(size).offset(num);

	},

	async addUser(c, params) {
		const { list } = params;

		if (list.length === 0) return;

		for (const emailRow of list) {
			if (!verifyUtils.isEmail(emailRow.email)) {
				throw new BizError(t('notEmail'));
			}

			const setting = await settingService.query(c);
			if (!settingService.isDomainValid(setting, emailUtils.getDomain(emailRow.email))) {
				throw new BizError(t('notEmailDomain'));
			}

			const { salt, hash } = await saltHashUtils.hashPassword(
				emailRow.password || cryptoUtils.genRandomPwd()
			);

			emailRow.salt = salt;
			emailRow.hash = hash;
		}


		const activeIp = reqUtils.getIp(c);
		const { os, browser, device } = reqUtils.getUserAgent(c);
		const activeTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

		const roleList = await roleService.roleSelectUse(c);
		const defRole = roleList.find(roleRow => roleRow.isDefault === roleConst.isDefault.OPEN);

		const userList = [];

		for (const emailRow of list) {
			let { email, hash, salt, roleName } = emailRow;
			let type = defRole.roleId;

			if (roleName) {
				const roleRow = roleList.find(role => role.name === roleName);
				type = roleRow ? roleRow.roleId : type;
			}

			const userSql = `INSERT INTO user (email, password, salt, type, os, browser, active_ip, create_ip, device, active_time, create_time)
			VALUES ('${email}', '${hash}', '${salt}', '${type}', '${os}', '${browser}', '${activeIp}', '${activeIp}', '${device}', '${activeTime}', '${activeTime}')`

			const accountSql = `INSERT INTO account (email, name, user_id)
			VALUES ('${email}', '${emailUtils.getName(email)}', 0);`;

			userList.push(c.env.db.prepare(userSql));
			userList.push(c.env.db.prepare(accountSql));

		}

		userList.push(c.env.db.prepare(`UPDATE account SET user_id = (SELECT user_id FROM user WHERE user.email = account.email) WHERE user_id = 0;`))

		try {
			await c.env.db.batch(userList);
		} catch (e) {
			if(e.message.includes('SQLITE_CONSTRAINT')) {
				throw new BizError(t('emailExistDatabase'))
			} else {
				throw e
			}
		}

	},

	async genToken(c, params) {

		await this.verifyUser(c, params)

		const uuid = uuidv4();

		await c.env.kv.put(KvConst.PUBLIC_KEY, uuid);

		return {token: uuid}
	},

	async verifyUser(c, params) {

		const { email, password } = params

		const userRow = await userService.selectByEmailIncludeDel(c, email);

		if (email !== c.env.admin) {
			throw new BizError(t('notAdmin'));
		}

		if (!userRow || userRow.isDel === isDel.DELETE) {
			throw new BizError(t('notExistUser'));
		}

		if (!await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			throw new BizError(t('IncorrectPwd'));
		}
	},

	/**
	 * Validasi access token dan kembalikan akun mailbox-nya.
	 * Token salah / akun terhapus -> error inboxNotFound.
	 */
	async getAccountByToken(c, key) {
		if (!key || typeof key !== 'string') {
			throw new BizError(t('invalidAccessKey'));
		}
		const accountRow = await accountService.selectByAccessToken(c, key.trim());
		if (!accountRow) {
			throw new BizError(t('inboxNotFound'), 404);
		}
		return accountRow;
	},

	/**
	 * Buat email sementara TANPA login (public flow, seperti tempamail.com).
	 * Generate access token UUID unik, tampilkan sekali ke user.
	 * Duplikat (termasuk soft-deleted) -> error jelas, tidak auto-restore
	 * demi keamanan (mencegah klaim mailbox milik orang lain).
	 */
	async createTempEmail(c, params) {
		const { addEmail, manyEmail, minEmailPrefix, emailPrefixFilter, domainList } = await settingService.query(c);

		let { email } = params;

		if (!(addEmail === settingConst.addEmail.OPEN && manyEmail === settingConst.manyEmail.OPEN)) {
			throw new BizError(t('addAccountDisabled'));
		}

		if (!email) {
			throw new BizError(t('emptyEmail'));
		}

		if (!verifyUtils.isEmail(email)) {
			throw new BizError(t('notEmail'));
		}

		if (!domainList.includes('@' + emailUtils.getDomain(email))) {
			throw new BizError(t('notExistDomain'));
		}

		if (emailUtils.getName(email).length < minEmailPrefix) {
			throw new BizError(t('minEmailPrefix', { msg: minEmailPrefix }));
		}

		if (emailPrefixFilter.some(content => emailUtils.getName(email).includes(content))) {
			throw new BizError(t('banEmailPrefix'));
		}

		// Cek duplikat termasuk yang soft-deleted -> error jelas (tanpa restore)
		const existing = await accountService.selectByEmailIncludeDel(c, email);
		if (existing) {
			if (existing.isDel === isDel.DELETE) {
				throw new BizError(t('isRegAccountDeleted'));
			}
			throw new BizError(t('isRegAccount'));
		}

		const accessToken = await accountService.generateAccessToken(c);

		const accountRow = await orm(c).insert(account).values({
			email: email,
			userId: 0,
			name: emailUtils.getName(email),
			accessToken: accessToken
		}).returning().get();

		// Kembalikan token sekali — user wajib menyimpannya
		return { email: accountRow.email, accessToken: accessToken };
	},

	/**
	 * Akses inbox via access token (tanpa login).
	 * Hanya bisa akses mailbox milik token tersebut.
	 */
	async accessInbox(c, params) {
		const { key, emailId, size, timeSort } = params;
		const accountRow = await this.getAccountByToken(c, key);

		const list = await emailService.listByAccessToken(c, accountRow.accountId, { emailId, size, timeSort });

		return {
			email: accountRow.email,
			accessToken: key.trim(),
			...list
		};
	},

	/**
	 * Hapus email individual via access token (soft delete).
	 */
	async deleteEmailByToken(c, params) {
		const { key, emailIds } = params;
		const accountRow = await this.getAccountByToken(c, key);

		if (!emailIds) {
			throw new BizError(t('emptyEmail'));
		}

		const emailIdList = String(emailIds).split(',').map(Number).filter(n => !isNaN(n));
		if (emailIdList.length === 0) {
			throw new BizError(t('emptyEmail'));
		}

		await emailService.deleteByAccount(c, accountRow.accountId, emailIdList);
	},

	/**
	 * Hapus seluruh mailbox sementara via access token (soft delete).
	 */
	async deleteMailboxByToken(c, params) {
		const { key } = params;
		const accountRow = await this.getAccountByToken(c, key);

		await orm(c).update(account)
			.set({ isDel: isDel.DELETE })
			.where(eq(account.accountId, accountRow.accountId))
			.run();

		// Soft delete juga semua email di mailbox tersebut
		await orm(c).update(email)
			.set({ isDel: isDel.DELETE })
			.where(eq(email.accountId, accountRow.accountId))
			.run();
	}

}

export default publicService
