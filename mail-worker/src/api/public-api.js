import app from '../hono/hono';
import result from '../model/result';
import publicService from '../service/public-service';
import emailService from '../service/email-service';

app.post('/public/genToken', async (c) => {
	const data = await publicService.genToken(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/public/emailList', async (c) => {
	const list = await publicService.emailList(c, await c.req.json());
	return c.json(result.ok(list));
});

app.post('/public/addUser', async (c) => {
	await publicService.addUser(c, await c.req.json());
	return c.json(result.ok());
});

// Fitur access token per mailbox (seperti tempamail.com) — tanpa login
app.post('/public/createTempEmail', async (c) => {
	const data = await publicService.createTempEmail(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/public/accessInbox', async (c) => {
	const data = await publicService.accessInbox(c, await c.req.json());
	return c.json(result.ok(data));
});

app.get('/public/accessContent', async (c) => {
	const accountRow = await publicService.getAccountByToken(c, c.req.query().key);
	const data = await emailService.contentByAccessToken(c, accountRow.accountId, c.req.query().emailId);
	return c.json(result.ok(data));
});

app.post('/public/deleteEmail', async (c) => {
	await publicService.deleteEmailByToken(c, await c.req.json());
	return c.json(result.ok());
});

app.post('/public/deleteMailbox', async (c) => {
	await publicService.deleteMailboxByToken(c, await c.req.json());
	return c.json(result.ok());
});
