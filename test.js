/*
		This test uses # Digital Ocean - replica Database
		with support@hotpointapp.com account.
*/

const { describe, it, before } = require('mocha');
const request = require('supertest');
require('dotenv').config();

let expect;
let cookie = '';
let dummyUser = null;
let currentUser = null;
let booths = [];
let boothsIds = null; // TODO: just temp, need to remove
let accountVisitors = [];
let recentVideos = [];
let newTemplate = null;

// Mock data for now because failed endpoints so we cannot get the data
let supportMockData = {
	boothId: '566116a10cf2e5bdafa4d82a',
	visitorId: '56ccea960cf27eecefa065ac',
	// let supportFaceId = '1234567890';
	// let supportFaceIdentityId = '1234567890';
	actionId: '5663d7590cf2e5bdafa4e33d',
	templateId: '566116a10cf2e5bdafa4d829',
	accountId: '55792c0d0cf206bed0ceafe4',
	userId: '55792bec0cf206bed0ceafe2',
	videoId: '5acd816448e376945ae9e551',
	jackpotId: '5756e48f0cf26e03bb58d922',
};

(async () => {
	try {
		const chai = await
			import('chai');
		expect = chai.expect;
	} catch (error) {
		console.error('Failed to load chai:', error);
	}
})();

const api = request(process.env.API_URL);

const loginAndGetCookie = async () => {
	if (!process.env.EMAIL || !process.env.PASSWORD) {
		console.log('Environment variables not set. Please create a .env file with:');
		console.log('EMAIL=your-email@example.com');
		console.log('PASSWORD=your-password');
		console.log('API_URL=http://localhost:8080/bihotpoint/services/api');
		throw new Error('Missing EMAIL or PASSWORD environment variables');
	}

	const res = await api
		.post('/login')
		.send({ email: process.env.EMAIL, password: process.env.PASSWORD });
	currentUser = res.body.data;

	if (res.status !== 200 || !res.headers['set-cookie']) {
		throw new Error(`Login failed: Status ${res.status}, Response: ${JSON.stringify(res.body)}`);
	}

	cookie = res.headers['set-cookie'];
};

const getBoothsIds = async () => {
	const res = await api.get('/owner/account').set('Cookie', cookie);
	boothsIds = res.body.boothsIds ?? [];
};

const getAccountVisitors = async () => {
	const res = await api.get(`/owner/${currentUser.userAccountIdentity}/visitors`).set('Cookie', cookie);
	accountVisitors = res.body;
};

describe('Testing', function () {
	this.timeout(10000);

	before(async () => {
		await new Promise(resolve => setTimeout(resolve, 100));
		await loginAndGetCookie();
		await getBoothsIds();
		await getAccountVisitors();
	});

	it('should have chai loaded', function () {
		if (!expect) {
			throw new Error('Chai not loaded yet');
		}
		expect(expect).to.be.a('function');
	});

	describe('Register Endpoints', function () {
		it('POST /register - should register a new user', async () => {
			const randomNumber = Math.floor(Math.random() * 1000000);
			const email = `newadmin${randomNumber}@yopmail.com`;	
			const res = await api
				.post('/register')
				.set('Cookie', cookie)
				.send({ name: 'BrandingUser', email });
			expect(res.status).to.equal(200);
		});
	});

	describe('Admin Endpoints', function () {
		it('GET /admin/dummy - should create a dummy user', async () => {
			const res = await api.get('/admin/dummy').set('Cookie', cookie);
			expect(res.status).to.equal(200);
			expect(res.body).to.have.property('user');
			dummyUser = res.body.user;
		});

		it('GET /admin/users - should fetch all users', async () => {
			const res = await api.get('/admin/users').set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('GET /admin/users - should include dummy user', async () => {
			const res = await api.get('/admin/users').set('Cookie', cookie);
			expect(res.status).to.equal(200);
			if (res.body) {
				const found = res.body.some((u) => u.key === (dummyUser.key || dummyUser.userIdentity));
				expect(found).to.be.true;
			}
		});

		it('GET /admin/users/:key - should fetch user by key', async () => {
			const res = await api.get(`/admin/users/${currentUser.userIdentity}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
			expect(res.body.key).to.equal(currentUser.userIdentity);
		});

		it('GET /admin/users/pending - should fetch all pending users', async () => {
			const res = await api.get('/admin/users/pending').set('Cookie', cookie);
			expect(res.status).to.equal(200);
			expect(res.body).to.be.an('array');
		});

		it('GET /admin/users/pending/:key - should fetch pending user by key if any', async () => {
			const res = await api.get('/admin/users/pending').set('Cookie', cookie);
			if (res.body.length) {
				const pendingKey = res.body[0].key;
				const detailRes = await api.get(`/admin/users/pending/${pendingKey}`).set('Cookie', cookie);
				expect(detailRes.status).to.equal(200);
				expect(detailRes.body.key).to.equal(pendingKey);
			}
		});

		it('GET /admin/users/pending/approve/:key - should approve pending user if any', async () => {
			const res = await api.get('/admin/users/pending').set('Cookie', cookie);
			if (res.body.length) {
				const pendingKey = res.body[0].key;
				const approveRes = await api.get(`/admin/users/pending/approve/${pendingKey}`).set('Cookie', cookie);
				expect(approveRes.status).to.equal(200);
			}
		});

		it('GET /admin/account - should fetch all accounts', async () => {
			const res = await api.get(`/admin/account`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('GET /admin/account/:key - should fetch account by key', async () => {
			const res = await api.get(`/admin/account/${currentUser.userAccountIdentity}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('PUT /admin/add - should create new admin', async () => {
			const randomNumber = Math.floor(Math.random() * 1000000);
			const email = `newadmin${randomNumber}@example.com`;
			const name = `New Admin ${randomNumber}`;
			const res = await api
				.put('/admin/add')
				.set('Cookie', cookie)
				.send({ email: email, password: 'secure123', name: name, phone: '1234567890' });
			expect(res.status).to.be.oneOf([200, 201]);
		});

		it('GET /admin/users - should include new admin', async () => {
			const res = await api.get('/admin/users').set('Cookie', cookie);
			const found = res.body.some((u) => u.email === 'newadmin@example.com');
			expect(found).to.be.true;
		});


		it('POST /admin/branding - should create branding user', async () => {
			const res = await api
				.post('/admin/branding')
				.set('Cookie', cookie)
				.send({ name: 'BrandingUser', email: 'brand@example.com', accountId: currentUser.userAccountIdentity, password: 'secure123' });
			expect(res.status).to.equal(200);
		});

		it('POST /admin/booth - should add booth', async () => {
			const res = await api
				.post('/admin/booth')
				.set('Cookie', cookie)
				.send({ name: 'Test Booth' });
			expect(res.status).to.equal(201);
		});

		it('GET /admin/booth/:key - should fetch booth by key', async () => {
			const res = await api
				.get(`/admin/booth/${currentUser.userAccountIdentity}`)
				.set('Cookie', cookie)
			expect(res.status).to.equal(200);
		});

		// TODO: it works but need booth Id instead of currentUser.userAccountIdentity
		// it('PUT /admin/booth - should update booth', async () => {
		//     const randomBoothName = `Test Booth ${Math.random().toString(36).substring(2, 15)}`;
		//     const res = await api
		//         .put('/admin/booth')
		//         .set('Cookie', cookie)
		//         .send({ name: randomBoothName, key: currentUser.userAccountIdentity });
		//     expect(res.status).to.equal(200);
		// });

		it('DELETE /admin/booth/:key - should delete booth by key', async () => {
			const newBoothRes = await api
				.post('/admin/booth')
				.set('Cookie', cookie)
				.send({ name: 'Test Booth' });
			const res = await api.delete(`/admin/booth/${newBoothRes.body.key}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('POST /admin/password - should change admin password', async () => {
			const res = await api
				.post('/admin/password')
				.set('Cookie', cookie)
				.send({ oldPassword: process.env.PASSWORD, newPassword: 'newsecure123' });
			expect(res.status).to.equal(200);
			if (res.status === 200 || res.status === 201) {
				// Change password back to original password
				await api
					.post('/admin/password')
					.set('Cookie', cookie)
					.send({ oldPassword: 'newsecure123', newPassword: process.env.PASSWORD });
			}
		});

		it('POST /admin/email - should change admin email', async () => {
			const res = await api
				.post('/admin/email')
				.set('Cookie', cookie)
				.send({ email: 'newadminemail@example.com' });
			expect(res.status).to.equal(200);

			if (res.status === 200 || res.status === 201) {
				// Change email back to original email
				await api
					.post('/admin/email')
					.set('Cookie', cookie)
					.send({ email: process.env.EMAIL });
			}
		});

		it('POST /admin/password/users - should change user password', async () => {
			const res = await api
				.post('/admin/password/users')
				.set('Cookie', cookie)
				.send({ key: currentUser.userIdentity, newPassword: 'newsecure123' });
			expect(res.status).to.equal(200);

			if (res.status === 200 || res.status === 201) {
				// Change password back to original password
				await api
					.post('/admin/password/users')
					.set('Cookie', cookie)
					.send({ key: currentUser.userIdentity, newPassword: process.env.PASSWORD });
			}
		});

		it('DELETE /admin/account/:key - should delete account by key', async () => {
			if (!dummyUser) {
				throw new Error('Dummy user not found');
			};

			const res = await api.delete(`/admin/account/${dummyUser.userAccountIdentity}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});
	});

	describe.only('Owner Endpoints', function () {
		it.only('GET /owner/:accountId/dropbox/auth - should retrieve dropbox auth', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/dropbox/auth`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
			expect(res.body.data).not.to.be.empty;
		});

		// TODO: don't know what is authCode
		// it('POST /owner/:accountId/dropbox/auth - should create dropbox auth', async () => {
		// 	const res = await api.post(`/owner/${currentUser.userAccountIdentity}/dropbox/auth`).set('Cookie', cookie).send({
		// 		authCode: '1234567890'
		// 	});
		// 	expect(res.status).to.equal(200);
		// 	expect(res.body.data).not.to.be.empty;
		// });

		// TODO: cannot upload file via test
		// it('POST /owner/:accountId/dropbox/upload - should upload file to dropbox', async () => {
		// 	const res = await api.post(`/owner/${currentUser.userAccountIdentity}/dropbox/upload`).set('Cookie', cookie).send({
		// 		boothId: boothsIds[0] ?? supportMockData.boothId,
		// 		from: 'test',
		// 		to: new Date().toISOString(),
		// 	});
		// 	expect(res.status).to.equal(200);
		// });

		it('POST /owner/:accountId/booth/:boothId/listMode - should set list mode', async () => {
			const res = await api.post(`/owner/${currentUser.userAccountIdentity}/booth/${boothsIds[0] ?? supportMockData.boothId}/listMode?listMode=whiteList`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('POST /owner/:accountId/add-video-list - should add video list', async () => {
			const res = await api.post(`/owner/${currentUser.userAccountIdentity}/add-video-list?videoId=5acd816448e376945ae9e551&listMode=whiteList`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('GET /owner/:accountId/booth/:boothId/video - should get recent videos', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/booth/${boothsIds[0] ?? supportMockData.boothId}/video`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('POST /owner/:accountId/templates - should create template', async () => {
			const formData = new FormData();
			formData.append('email_body', 'Test Email Body');
			formData.append('email_subj', 'Test Email Subject');
			formData.append('email_to', 'test@example.com');
			formData.append('email_from', 'test@example.com');
			formData.append('template_name', 'Test Template');
			formData.append('sms_text', 'Test SMS Text');	
			const res = await api.post(`/owner/${currentUser.userAccountIdentity}/templates`).set('Cookie', cookie).send(formData);
			expect(res.status).to.equal(200);
		});

		it('GET /owner/:accountId/templates - should get templates', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/templates`).set('Cookie', cookie);
			newTemplate = res.body.data;
			expect(res.status).to.equal(200);
		});

		it('GET /owner/:accountId/templates/:templateId - should get template by ID', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/templates/${newTemplate.id}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('POST /owner/:accountId/templates/:templateId - should update template', async () => {
			const formData = new FormData();
			formData.append('email_body', 'Test Email Body Updated');
			formData.append('email_subj', 'Test Email Subject Updated');
			formData.append('email_to', 'test@example.com Updated');
			formData.append('email_from', 'test@example.com Updated');
			formData.append('template_name', 'Test Template');
			formData.append('sms_text', 'Test SMS Text');
			const res = await api.post(`/owner/${currentUser.userAccountIdentity}/templates/${newTemplate.id}`).set('Cookie', cookie).send(formData);
			expect(res.status).to.equal(200);
		});

		it('POST /owner/:accountId/templates/:templateId/default - should make template default', async () => {
			const res = await api.post(`/owner/${currentUser.userAccountIdentity}/templates/${newTemplate.id}/default`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		// TODO: cannot create jackpot since it's require video
		// it('POST /owner/:accountId/templates/:templateId/jackpots - should create jackpot', async () => {
		// 	const formData = new FormData();
		// 	formData.append('send_button_text', 'Send');
		// 	formData.append('email_subj', 'Test Email Subject Updated');
		// 	formData.append('email_body', 'Test Email Body Updated');
		// 	formData.append('jack_prize', '100');
		// 	const res = await api.post(`/owner/${currentUser.userAccountIdentity}/templates/${newTemplate.id}/jackpots`).set('Cookie', cookie).send(formData);
		// 	expect(res.status).to.equal(200);
		// });

		it('POST /owner/:accountId/jackpots/:jackpotId - should update jackpot', async () => {
			const formData = new FormData();
			formData.append('send_button_text', 'Send');
			formData.append('email_subj', 'Test Email Subject Updated');
			formData.append('email_body', 'Test Email Body Updated');
			formData.append('jack_prize', '100');
			const res = await api.post(`/owner/${currentUser.userAccountIdentity}/jackpots/${supportMockData.jackpotId}`).set('Cookie', cookie).send(formData);
			expect(res.status).to.equal(200);
			expect(res.body.data.sendButtonText).to.equal('Send');
		});

		it('GET /owner/:accountId/templates/:templateId/jackpots - should get template jackpots', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/templates/${newTemplate.id}/jackpots`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('GET /owner/:accountId/jackpot - should get account jackpots', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/jackpot`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('GET /owner/:accountId/jackpots/:jackpotId - should get jackpot by ID', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/jackpots/${supportMockData.jackpotId}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('DELETE /owner/:accountId/gallery/:templateId/delete - should delete gallery', async () => {
			const res = await api.delete(`/owner/${currentUser.userAccountIdentity}/gallery/${newTemplate.id}/delete`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('DELETE /owner/:accountId/gallery/:templateId/delete/assets - should delete assets', async () => {
			const res = await api.delete(`/owner/${currentUser.userAccountIdentity}/gallery/${newTemplate.id}/delete/assets`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('DELETE /owner/:accountId/templates/:templateId - should delete template', async () => {
			const res = await api.delete(`/owner/${currentUser.userAccountIdentity}/templates/${newTemplate.id}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('DELETE /owner/:accountId/jackpots/:jackpotId - should delete jackpot', async () => {
			const res = await api.delete(`/owner/${currentUser.userAccountIdentity}/jackpots/${supportMockData.jackpotId}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('GET /owner/account - should retrieve owner account details', async () => {
			expect(boothsIds).to.be.an('array');
		});

		it('GET /owner/:accountId/booth - should retrieve booths for account', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/booth`).set('Cookie', cookie);
			booths = res.body;
			expect(res.status).to.equal(200);
			expect(res.body).to.be.an('array');
		});

		it('GET /owner/booth/:boothId - should retrieve booth details', async () => {
			const res = await api.get(`/owner/booth/${boothsIds[0] ?? supportMockData.boothId}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
			expect(res.body).to.have.property('key');
			expect(res.body.key).to.equal(boothsIds[0] ?? supportMockData.boothId);
		});

		it('GET /owner/:accountId/actions - should retrieve actions for account', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/actions`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
			expect(res.body).to.be.an('array');
		});

		it('GET /owner/:accountId/faceIdentities/:visitorId - should retrieve face identities for visitor', async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/faceIdentities/${accountVisitors?.[0]?.key ?? supportMockData.visitorId}`).set('Cookie', cookie);
			expect(res.status).to.equal(200);
			expect(res.body.data).not.to.be.null;
		});

		// TODO: it works but need template Id instead of process.env.TEMPLATE_ID
		// it.only('GET /owner/:accountId/templates/:templateId - should get template by ID', async() => {
		//     const res = await api.get(`/owner/${currentUser.userAccountIdentity}/templates/${process.env.TEMPLATE_ID}`).set('Cookie', cookie);
		//     expect(res.status).to.equal(200);
		//     expect(res.body).to.have.property('key');
		//     expect(res.body.key).to.equal(process.env.TEMPLATE_ID);
		// });
	});

	describe('Visitor Endpoints', function () {
		before(async () => {
			const res = await api.get(`/owner/${currentUser.userAccountIdentity}/visitors`).set('Cookie', cookie);
			accountVisitors = res.body;
		});

		// TODO: it works but need visitor Id
		// it('GET /visitor/:visitorId - should get visitor by ID', async() => {
		//     const visitorId = accountVisitors?.[0]?.key;
		//     const res = await api.get(`/visitor/${visitorId}`).set('Cookie', cookie);
		//     expect(res.status).to.equal(200);
		// });

		// TODO: task failed but need boothId
		// it.only('POST /visitor - should create visitor', async() => {
		//     const visitorData = {
		//         email: 'visitor@example.com',
		//         boothId: ''
		//     };
		//     const res = await api
		//         .post('/visitor')
		//         .set('Cookie', cookie)
		//         .send(visitorData);
		//     expect(res.status).to.equal(200);
		// });

		it('POST /visitor/:visitorId/makePrimaryFace/:actionId - should make primary face by action ID', async () => {
			const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
			const actionId = accountVisitors[0].actionId ?? supportMockData.actionId;
			const res = await api
				.post(`/visitor/${visitorId}/makePrimaryFace/${actionId}`)
				.set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('POST /visitor/:visitorId/makePrimaryFaceById/:faceId - should make primary face by face ID', async () => {
			const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
			const faceId = accountVisitors[0].faceId ?? supportMockData.faceId;
			const res = await api
				.post(`/visitor/${visitorId}/makePrimaryFaceById/${faceId}`)
				.set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('GET /visitor/:visitorId/resetPrimaryFace/:faceIdentityId - should reset primary face', async () => {
			const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
			const faceIdentityId = accountVisitors[0].faceIdentityId ?? supportMockData.faceIdentityId;
			const res = await api
				.get(`/visitor/${visitorId}/resetPrimaryFace/${faceIdentityId}`)
				.set('Cookie', cookie);
			expect(res.status).to.equal(200);
		});

		it('POST /visitor/external - should save external visitor', async () => {
			const externalVisitorData = {
				boothId: boothsIds[0] ?? supportMockData.boothId,
				email: 'external@example.com',
			};
			const res = await api
				.post('/visitor/external')
				.set('Cookie', cookie)
				.send(externalVisitorData);
			expect(res.status).to.equal(200);
		});
	});

	describe('Booth Endpoints', function () {

	})
});