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
let accountVisitors = [];
let recentVideos = [];
let newAdminEmail = '';

const PROJECT_TYPE = {
  AR: 'AR',
  VR: 'VR',
  '3D': '3D',
  '2D': '2D',
  mobile: 'mobile',
}

const responseData = {
  newTemplate: null,
  newJackpot: null,
  boothsIds: null,
}

// Mock data for now because failed endpoints so we cannot get the data
const supportMockData = {
  boothId: '566116a10cf2e5bdafa4d82a',
  visitorId: '56ccea960cf27eecefa065ac',
  // let supportFaceId = '1234567890';
  // let supportFaceIdentityId = '1234567890';
  actionId: '5663d7590cf2e5bdafa4e33d',
  templateId: '566116a10cf2e5bdafa4d829',
  accountId: '55792c0d0cf206bed0ceafe4',
  userId: '55792bec0cf206bed0ceafe2',
  videoId: '5acd816448e376945ae9e551',
  pollId: null, // Will be set when poll is created
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

  console.log('Logging in with email:', process.env.EMAIL, 'and password:', process.env.PASSWORD);

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
  responseData.boothsIds = res.body.boothsIds ?? [];
};

const getAccountVisitors = async () => {
  const res = await api.get(`/owner/${currentUser.userAccountIdentity}/visitors`).set('Cookie', cookie);
  accountVisitors = res.body;
};

describe('Testing', function () {
  this.timeout(30000);

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
      newAdminEmail = email;
      const res = await api
        .put('/admin/add')
        .set('Cookie', cookie)
        .send({ email: email, password: 'secure123', name: name, phone: '1234567890' });
      expect(res.status).to.be.oneOf([200, 201]);
    });

    it('GET /admin/users - should include new admin', async () => {
      const res = await api.get('/admin/users').set('Cookie', cookie);
      const found = res.body.some((u) => u.email === newAdminEmail);
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

  describe('Owner Endpoints', function () {
    it('GET /owner/:accountId/dropbox/auth - should retrieve dropbox auth', async () => {
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

    it('POST /owner/:accountId/dropbox/upload - should upload file to dropbox', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/dropbox/upload`).set('Cookie', cookie).send({
        boothId: responseData.boothsIds[0] ?? supportMockData.boothId,
        from: 'test',
        to: new Date().toISOString(),
      });
      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/booth/:boothId/listMode - should set list mode', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/booth/${responseData.boothsIds[0] ?? supportMockData.boothId}/listMode?listMode=whiteList`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/add-video-list - should add video list', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/add-video-list?videoId=5acd816448e376945ae9e551&listMode=whiteList`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/booth/:boothId/video - should get recent videos', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/booth/${responseData.boothsIds[0] ?? supportMockData.boothId}/video`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/templates - should create template', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/templates`).set('Cookie', cookie)
        .field('email_body', 'Test Email Body')
        .field('email_subj', 'Test Email Subject')
        .field('email_to', 'test@example.com')
        .field('email_from', 'test@example.com')
        .field('template_name', 'Test Template')
        .field('sms_text', 'Test SMS Text');
      responseData.newTemplate = res.body.data;
      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/templates - should get templates', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/templates`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/templates/:templateId - should get template by ID', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/templates/${responseData.newTemplate.id}`).set('Cookie', cookie);
      expect(res.body.data.id).to.equal(responseData.newTemplate.id);
      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/templates/:templateId - should update template', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/templates/${responseData.newTemplate.id}`).set('Cookie', cookie)
        .field('email_body', 'Test Email Body Updated')
        .field('email_subj', 'Test Email Subject Updated')
        .field('email_to', 'test@example.com Updated')
        .field('email_from', 'test@example.com Updated')
        .field('template_name', 'Test Template')
        .field('sms_text', 'Test SMS Text');
      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/templates/:templateId/default - should make template default', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/templates/${responseData.newTemplate.id}/default`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/templates/:templateId/jackpots - should create jackpot', async () => {
      const testFileBuffer = Buffer.from('fake video content');
      const jackPrizes = JSON.stringify([
        { name: "First Prize", quantity: 1 },
        { name: "Second Prize", quantity: 5 }
      ]);
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/templates/${responseData.newTemplate.id}/jackpots`).set('Cookie', cookie)
        .field('send_button_text', 'Send')
        .field('email_subj', 'Test Email Subject Updated')
        .field('email_body', 'Test Email Body Updated')
        .field('jack_prize', jackPrizes)
        .attach('jackpot_video', testFileBuffer, 'test-video.mp4');
      responseData.newJackpot = res.body.data;
      console.log('should create jackpot', responseData.newJackpot);
      expect(res.status).to.equal(200);
    });

    // TODO: blocked by create jackpot endpoint
    // it('POST /owner/:accountId/jackpots/:jackpotId - should update jackpot', async () => {
    //   const res = await api.post(`/owner/${currentUser.userAccountIdentity}/jackpots/${supportMockData.jackpotId}`)
    //     .set('Cookie', cookie)
    //     .field('send_button_text', 'Send')
    //     .field('email_subj', 'Test Email Subject Updated')
    //     .field('email_body', 'Test Email Body Updated')
    //     .field('jack_prize', '100');
    //   console.log('should update jackpot', res.body);
    //   expect(res.status).to.equal(200);
    //   expect(res.body.data.sendButtonText).to.equal('Send');
    // });

    it('GET /owner/:accountId/templates/:templateId/jackpots - should get template jackpots', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/templates/${responseData.newTemplate.id}/jackpots`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/jackpot - should get account jackpots', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/jackpot`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/templates/:templateId/jackpots - should get template jackpots', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/templates/${responseData.newTemplate.id}/jackpots`).set('Cookie', cookie);
      console.log('should get template jackpots', res.body);
      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/jackpots/:jackpotId - should get jackpot by ID', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/jackpots/${responseData.newJackpot.jackpotIdentity}`).set('Cookie', cookie);
      console.log('should get jackpot by ID', res.body);
      expect(res.status).to.equal(200);
    });

    it('DELETE /owner/:accountId/gallery/:templateId/delete - should delete gallery', async () => {
      const res = await api.delete(`/owner/${currentUser.userAccountIdentity}/gallery/${responseData.newTemplate.id}/delete`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal("success");
    });

    it('DELETE /owner/:accountId/gallery/:templateId/delete/assets - should delete assets', async () => {
      const res = await api.delete(`/owner/${currentUser.userAccountIdentity}/gallery/${responseData.newTemplate.id}/delete/assets`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
    });

    it('DELETE /owner/:accountId/templates/:templateId - should delete template', async () => {
      const res = await api.delete(`/owner/${currentUser.userAccountIdentity}/templates/${responseData.newTemplate.id}`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
    });

    it('DELETE /owner/:accountId/jackpots/:jackpotId - should delete jackpot', async () => {
      const res = await api.delete(`/owner/${currentUser.userAccountIdentity}/jackpots/${responseData.newJackpot.jackpotIdentity}`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal("success");
    });

    it('GET /owner/account - should retrieve owner account details', async () => {
      expect(responseData.boothsIds).to.be.an('array');
    });

    it('POST /owner/booth/:boothId/update - should update booth', async () => {
      const res = await api.post(`/owner/booth/${responseData.boothsIds[0] ?? supportMockData.boothId}/update?newEventId=${responseData.boothsIds[0]}&oldEventId=${responseData.boothsIds[0]}`).set('Cookie', cookie);
      console.log('should update booth', res.body);
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('updated');
    });

    it('GET /owner/:accountId/stat/mail - should get mail status statistics', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/stat/mail`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('PUT /owner/account - should update account details', async () => {
      const res = await api.put('/owner/account').set('Cookie', cookie).send({
        name: 'Updated Account Name',
        contactEmail: 'updated@example.com'
      });
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('account updated');

      if (res.status === 200) {
        await api.put('/owner/account').set('Cookie', cookie).send({
          name: currentUser.userName,
          contactEmail: currentUser.userEmail
        });
      }
    });

    it('PUT /owner/:accountId/booth/:boothId - should update booth for account', async () => {
      const randomNumber = Math.floor(Math.random() * 1000000);
      const res = await api.put(`/owner/${currentUser.userAccountIdentity}/booth`).set('Cookie', cookie).send({
        key: responseData.boothsIds[0] ?? supportMockData.boothId,
        name: `Test ${randomNumber}`,
      });

      expect(res.status).to.equal(200);
      expect(res.body.key).to.equal(responseData.boothsIds[0] ?? supportMockData.boothId);
      expect(res.body.name).to.equal(`Test ${randomNumber}`);
    });

    it('GET /owner/user - should get owner user details', async () => {
      const res = await api.get('/owner/user').set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.email).to.equal(currentUser.userEmail);
    });

    it('POST /owner/:accountId/account/logo - should upload account logo', async () => {
      const testImageBuffer = Buffer.from('fake image content');
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/account/logo`).set('Cookie', cookie)
        .attach('logo', testImageBuffer, 'logo.png');
      console.log('should upload account logo', res.body);
      expect(res.status).to.equal(200);
    });

    it('POST /owner/password - should change owner password', async () => {
      const res = await api.post('/owner/password').set('Cookie', cookie).send({
        oldPassword: process.env.PASSWORD,
        newPassword: 'newPassword123'
      });
      console.log('should change owner password', res.body);
      expect(res.status).to.equal(200);

      // Change password back
      if (res.status === 200) {
        await api.post('/owner/password').set('Cookie', cookie).send({
          oldPassword: 'newPassword123',
          newPassword: process.env.PASSWORD
        });
      }
    });

    it.skip('POST /owner/password/reset - should reset password', async () => {
      const res = await api.post('/owner/password/reset').set('Cookie', cookie).send({
        email: process.env.EMAIL
      });
      console.log('should reset password', res.body);
      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/template - should update template images', async () => {
      const testImageBuffer = Buffer.from('fake template image');
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/template`).set('Cookie', cookie)
        .attach('templateImage', testImageBuffer, 'template.png');

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('booth updated');
    });

    it('POST /owner/:accountId/visitor/export - should export visitors as CSV', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/visitor/export`).set('Cookie', cookie).send({
        boothIds: [responseData.boothsIds[0] ?? supportMockData.boothId],
        from: '2025-04-01',
        to: new Date().toISOString()
      });
      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/action/export - should export actions as CSV', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/action/export`).set('Cookie', cookie).send({
        boothIds: [responseData.boothsIds[0] ?? supportMockData.boothId],
        from: '2025-04-01',
        to: new Date().toISOString()
      });
      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/send/mail - should send mail to visitors', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/send/mail`).set('Cookie', cookie).send({
        boothIds: [responseData.boothsIds[0] ?? supportMockData.boothId]
      });
      console.log('should send mail to visitors', res.body);
      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/template/:key - should get template by key', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/template/${responseData.newTemplate.id}`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.key).to.equal(responseData.newTemplate.id);
    });

    // This get all visitors (a lot of data). Becareful to run
    // it('GET /owner/:accountId/visitor - should get visitors (deprecated)', async () => {
    //   const res = await api.get(`/owner/${currentUser.userAccountIdentity}/visitor`).set('Cookie', cookie);

    //   expect(res.status).to.equal(200);
    // });

    it('GET /owner/:accountId/actions?page=1 - should get actions with pagination', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/actions?page=1`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('GET /owner/:accountId/visitors?page=1 - should get visitors with pagination', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/visitors?page=1`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('POST /owner/:accountId/visitors?page=1 - should get visitors with filter', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/visitors?page=1`).set('Cookie', cookie).send({
        boothIds: [responseData.boothsIds[0] ?? supportMockData.boothId]
      });

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('GET /owner/:accountId/visitor/:visitorId/action/:actionId/email/resend - should resend email', async () => {
      if (accountVisitors.length > 0) {
        const visitorId = accountVisitors[0].key ?? supportMockData.visitorId;
        const actionId = supportMockData.actionId;
        const res = await api.get(`/owner/${currentUser.userAccountIdentity}/visitor/${visitorId}/action/${actionId}/email/resend`).set('Cookie', cookie);
        expect(res.status).to.equal(200);
      }
    });

    it('GET /owner/:accountId/visitors/:visitorId - should get specific visitor', async () => {
      const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/visitors/${visitorId}`).set('Cookie', cookie);

      expect(res.status).to.be.oneOf([200, 404]); // 404 if visitor not found
      expect(res.body.result).to.equal('success');
      expect(res.body.data.id).to.equal(visitorId);
    });

    it('GET /owner/:accountId/faceIdentities/:visitorId - should get face identities for visitor', async () => {
      const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/faceIdentities/${visitorId}`).set('Cookie', cookie);

      expect(res.status).to.be.oneOf([200, 404]); // 404 if visitor not found
      expect(res.body.result).to.equal('success');
      expect(res.body.data.id).to.equal(visitorId);
    });

    it('GET /owner/:accountId/visitors/:visitorId/associated - should get visitor actions associated', async () => {
      const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/visitors/${visitorId}/associated`).set('Cookie', cookie);

      expect(res.status).to.be.oneOf([200, 404]); // 404 if visitor not found
      expect(res.body.result).to.equal('success');
      expect(res.body.data.id).to.equal(visitorId);
    });

    it('POST /owner/:accountId/faceIdentities/:visitorId/associated - should get face identities associated', async () => {
      const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/faceIdentities/${visitorId}/associated`).set('Cookie', cookie).send([
        supportMockData.actionId
      ]);

      expect(res.status).to.be.oneOf([200, 404]); // 404 if visitor not found
      expect(res.body.result).to.equal('success');
      expect(res.body.data.id).to.equal(visitorId);
    });

    it('GET /owner/:accountId/url - should get visitors URL', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/url?visitorId=${supportMockData.visitorId}&accountName=testAccount`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/visitor/:skip - should get entire visitors with skip', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/visitor/0`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(Array.isArray(res.body)).to.equal(true);
    });

    it('GET /owner/:accountId/booth - should get booths by account key', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/booth`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(Array.isArray(res.body)).to.equal(true);
    });

    it('GET /owner/booth/:key - should get booth by key', async () => {
      const boothKey = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/owner/booth/${boothKey}`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.key).to.equal(boothKey);
    });

    // Statistics endpoints
    it('GET /owner/:accountId/statistic - should get quick stats', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/statistic`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/statistic/last/:days - should get last days statistics', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/statistic/last/7`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/statistic/lifetime - should get lifetime statistics', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/statistic/lifetime`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/statistic/:boothId - should get booth specific quick stats', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/statistic/${boothId}`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/statistic/last/:days/:boothId - should get booth specific last days stats', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/statistic/last/7/${boothId}`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/statistic/lifetime/:boothId - should get booth specific lifetime stats', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/statistic/lifetime/${boothId}`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/statistic/:dataType/:days/:interval - should get custom statistics', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/statistic/actions/7/hour`).set('Cookie', cookie).send([
        responseData.boothsIds[0] ?? supportMockData.boothId
      ]);

      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/peakhour - should get peak hours', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/peakhour`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('POST /owner/:accountId/peakhours/:boothId - should get 24 hours activity for booth as graph', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/peakhours/${boothId}`).set('Cookie', cookie).send({
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      });

      expect(res.status).to.equal(200);
    });

    it('GET /owner/:accountId/activity/:boothId - should get last 24 hours activity for booth as graph', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/activity/${boothId}`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(Array.isArray(res.body)).to.equal(true);
    });

    it('GET /owner/:accountId/activity - should get last 24 hours activity as graph', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/activity`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(Array.isArray(res.body)).to.equal(true);
    });

    it('POST /owner/:accountId/activity - should get last period activity as graph', async () => {
      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/activity`).set('Cookie', cookie).send({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      });

      expect(res.status).to.equal(200);
    });

    it('GET /owner/isUpdated/:boothId - should check if template is updated', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/owner/isUpdated/${boothId}`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.updated).to.equal(false) || expect(res.body.updated).to.equal(true);
    });

    // Unity endpoints
    it('GET /owner/booth/:boothId/unity - should get unity for booth', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/owner/booth/${boothId}/unity`).set('Cookie', cookie);

      expect(res.status).to.be.oneOf([200, 404]); // 404 if no unity found
    });

    it('POST /owner/booth/:boothId/unity - should create unity for booth', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const payload = {
        projectType: PROJECT_TYPE.AR,
        download: false,
        update: false,
        assetBundleLocation: 'https://example.com/asset-bundle.unity3d',
        assetBundleName: 'asset-bundle',
        sceneName: 'scene',
        objectName: 'object',
        objectVariable: 'objectVariable',
        thumbnail: 'https://example.com/thumbnail.png',
        background: 'https://example.com/background.png',
        screensaver: 'https://example.com/screensaver.png'
      }

      const res = await api.post(`/owner/booth/${boothId}/unity`).set('Cookie', cookie).send([payload]);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('PUT /owner/booth/:boothId/unity - should update unity for booth', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const payload = {
        projectType: PROJECT_TYPE.AR,
        download: false,
        update: false,
        assetBundleLocation: 'https://example.com/asset-bundle.unity3d',
        assetBundleName: 'asset-bundle',
        sceneName: 'scene',
        objectName: 'object',
        objectVariable: 'objectVariable',
      }
      const res = await api.put(`/owner/booth/${boothId}/unity`).set('Cookie', cookie).send([payload]);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('DELETE /owner/booth/:boothId/unity - should delete unity for booth', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.delete(`/owner/booth/${boothId}/unity`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    // M4V Overlay endpoints
    it('POST /owner/booth/:boothId/m4voverlaylist - should add M4V overlays', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const payload = {
        alphaVideoUrl: 'https://example.com/overlay.m4v',
        color: 'red',
        similarity: 0.5,
        blend: 0.5,
        additionalParams: 'additionalParams',
        previewThumbnailImage: 'https://example.com/preview.png',
        alphaVideoIdentifier: 'alphaVideoIdentifier',
        thresholdSensitivity: 0.5,
        smoothing: 0.5,
        alphaSecondaryVideoUrl: 'https://example.com/secondary.m4v'
      }
      const res = await api.post(`/owner/booth/${boothId}/m4voverlaylist`).set('Cookie', cookie).send([
        payload
      ]);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('PUT /owner/booth/:boothId/m4voverlaylist - should update M4V overlays', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const payload = {
        alphaVideoUrl: 'https://example.com/updated-overlay.m4v',
        color: 'blue',
        similarity: 0.6,
        blend: 0.6,
        additionalParams: 'updatedAdditionalParams',
        previewThumbnailImage: 'https://example.com/updated-preview.png',
        alphaVideoIdentifier: 'updatedAlphaVideoIdentifier',
        thresholdSensitivity: 0.6,
        smoothing: 0.6,
        alphaSecondaryVideoUrl: 'https://example.com/updated-secondary.m4v'
      }
      const res = await api.put(`/owner/booth/${boothId}/m4voverlaylist`).set('Cookie', cookie).send([
        payload
      ]);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('DELETE /owner/booth/:boothId/m4voverlaylist - should delete M4V overlays', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.delete(`/owner/booth/${boothId}/m4voverlaylist`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    // Poll endpoints
    it('POST /owner/poll - should create poll', async () => {
      const payload = {
        pollIdentity: 'pollIdentity',
        templates: ['template1', 'template2'],
        pollName: 'Test Poll',
        questions: [
          {
            question: 'Test Poll Question?',
            answers: ['Answer 1', 'Answer 2', 'Answer 3'],
            active: true,
            questionText: 'Test Poll Question?',
            choices: [
              {
                choiceName: 'Choice 1',
                choiceImage: 'https://example.com/choice1.png',
              }
            ]
          }
        ]
      }
      const res = await api.post('/owner/poll').set('Cookie', cookie).send(payload);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');

      // Store poll ID for subsequent tests
      if (res.body.data) {
        supportMockData.pollId = res.body.data.pollIdentity;
      }
    });

    it('PUT /owner/poll/:pollIdentity - should update poll', async () => {
      if (supportMockData.pollId) {
        const res = await api.put(`/owner/poll/${supportMockData.pollId}`).set('Cookie', cookie).send({
          question: 'Updated Poll Question?',
          answers: ['Updated Answer 1', 'Updated Answer 2'],
          active: false
        });

        expect(res.status).to.equal(200);
        expect(res.body.result).to.equal('success');
      }
    });

    it('DELETE /owner/poll/:pollIdentity - should delete poll', async () => {
      if (supportMockData.pollId) {
        const res = await api.delete(`/owner/poll/${supportMockData.pollId}`).set('Cookie', cookie);

        expect(res.status).to.equal(200);
        expect(res.body.result).to.equal('success');
      }
    });

    // Push and Email Template endpoints
    it('GET /owner/:accountId/booth/:boothId/push/v1 - should push pusher event', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/booth/${boothId}/push/v1?q=test`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('POST /owner/emailTemplates/send/test - should send test email', async () => {
      const res = await api.post('/owner/emailTemplates/send/test').set('Cookie', cookie).send({
        recipientEmail: 'test@example.com',
        emailTemplate: '<h1>Test Email</h1><p>This is a test email.</p>'
      });

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('POST /owner/emailTemplates/:boothId - should create booth email template', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.post(`/owner/emailTemplates/${boothId}`).set('Cookie', cookie).send({
        name: 'Test Email Template',
        subject: 'Test Subject',
        body: '<h1>Test Template</h1><p>This is a test template.</p>',
        template: 'template1'
      });

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('GET /owner/emailTemplates/:boothId - should get booth email templates', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/owner/emailTemplates/${boothId}`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(Array.isArray(res.body)).to.be.true;
    });

    // Schedule Endpoints (Owner)
    it('POST /owner/:accountId/schedule/events - should add booth event', async () => {
      const boothEventPayload = {
        boothIdentity: responseData.boothsIds[0] ?? supportMockData.boothId,
        templateIdentity: supportMockData.templateId,
        boothEventName: 'Test Event',
        start: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
        schedule: 'NONE'
      };

      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/schedule/events`)
        .set('Cookie', cookie)
        .send(boothEventPayload);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');

      // Store event ID for subsequent tests
      if (res.body.data) {
        supportMockData.eventId = res.body.data.boothEventIdentity;
      }
    });

    it('GET /owner/:accountId/schedule/events/:eventId - should get event by identity', async () => {
      if (supportMockData.eventId) {
        const res = await api.get(`/owner/${currentUser.userAccountIdentity}/schedule/events/${supportMockData.eventId}`)
          .set('Cookie', cookie);

        expect(res.status).to.equal(200);
        expect(res.body.result).to.be.oneOf(['success', 'not found']);
      }
    });

    it('GET /owner/:accountId/schedule/booths/:boothIdentity/events - should get booth events', async () => {
      const res = await api.get(`/owner/${currentUser.userAccountIdentity}/schedule/booths/${responseData.boothsIds[0] ?? supportMockData.boothId}/events`)
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.be.oneOf(['success', 'not found any', 'invalid booth identity']);
    });

    it('POST /owner/:accountId/schedule/booths/events - should get booth events for multiple booths', async () => {
      const boothIdsPayload = {
        boothIds: [responseData.boothsIds[0] ?? supportMockData.boothId]
      };

      const res = await api.post(`/owner/${currentUser.userAccountIdentity}/schedule/booths/events`)
        .set('Cookie', cookie)
        .send(boothIdsPayload);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.be.oneOf(['success', 'not found any']);
    });

    it('DELETE /owner/:accountId/schedule/events/:eventId - should remove booth event', async () => {
      if (supportMockData.eventId) {
        const res = await api.delete(`/owner/${currentUser.userAccountIdentity}/schedule/events/${supportMockData.eventId}`)
          .set('Cookie', cookie);

        expect(res.status).to.equal(200);
        expect(res.body.result).to.equal('success');
      }
    });
  });

  describe('Venue Endpoints', function () {
    it('GET /venue/stats/:days - should get top booths by interval', async () => {
      const res = await api.get('/venue/stats/7').set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('GET /venue/stats/:timestampStart/:timestampEnd - should get underperformed booths by interval', async () => {
      const timestampStart = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
      const timestampEnd = Date.now();

      const res = await api.get(`/venue/stats/${timestampStart}/${timestampEnd}`).set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('POST /venue/setup/new - should create new venue', async () => {
      const randomNumber = Math.floor(Math.random() * 1000000);
      const venuePayload = {
        venue_group_name: `Test Venue ${randomNumber}`,
        venue_email: `venue${randomNumber}@example.com`,
        booth_name: `Test Booth ${randomNumber}`,
        hotpoint_account: {
          user_name: `testuser${randomNumber}`,
          email: `hotpoint${randomNumber}@example.com`,
          full_name: `Test User ${randomNumber}`,
          password: 'testPassword123'
        }
      };

      const res = await api.post('/venue/setup/new')
        .set('Cookie', cookie)
        .send(venuePayload);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('GET /venue/account/:boothId - should get associated accounts', async () => {
      const res = await api.get(`/venue/account/${responseData.boothsIds[0] ?? supportMockData.boothId}`)
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('POST /venue/:accountId/booth/ - should add booth to account', async () => {
      const randomNumber = Math.floor(Math.random() * 1000000);
      const boothPayload = {
        boothName: `Venue Test Booth ${randomNumber}`
      };

      const res = await api.post(`/venue/${currentUser.userAccountIdentity}/booth/`)
        .set('Cookie', cookie)
        .send(boothPayload);

      expect(res.status).to.be.oneOf([200, 201]);
      expect(res.body.result).to.equal('success');
    });

    it('POST /venue/:accountId/booth/:boothId - should update booth', async () => {
      const randomNumber = Math.floor(Math.random() * 1000000);

      const res = await api.post(`/venue/${currentUser.userAccountIdentity}/booth/${responseData.boothsIds[0] ?? supportMockData.boothId}`)
        .set('Cookie', cookie)
        .field('key', responseData.boothsIds[0] ?? supportMockData.boothId)
        .field('name', `Updated Venue Booth ${randomNumber}`)
        .field('description', 'Updated booth description');

      expect(res.status).to.be.oneOf([200]);
      expect(res.body.result).to.equal('success');
      expect(res.body.data.name).to.equal(`Updated Venue Booth ${randomNumber}`);
    });

    it('POST /venue/:accountId/booth/:boothId/location - should update booth location', async () => {
      const locationPayload = {
        name: 'Test Location',
        address: '123 Test Street',
        latitude: '40.7128',
        longitude: '-74.0060',
        city: 'New York',
        category: 'Entertainment'
      };

      const res = await api.post(`/venue/${currentUser.userAccountIdentity}/booth/${responseData.boothsIds[0] ?? supportMockData.boothId}/location`)
        .set('Cookie', cookie)
        .send(locationPayload);

      expect(res.status).to.be.oneOf([200]);
      expect(res.body.result).to.equal('success');
    });

    it('POST /venue/:accountId/booth/:boothId/api-token - should update booth api token', async () => {
      const apiTokenPayload = {
        apiToken: 'test-api-token-123'
      };

      const res = await api.post(`/venue/${currentUser.userAccountIdentity}/booth/${responseData.boothsIds[0] ?? supportMockData.boothId}/api-token`)
        .set('Cookie', cookie)
        .send(apiTokenPayload);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('PUT /venue/booth/:boothId/customterms - should update booth custom terms', async () => {
      const customTermsPayload = {
        customTerms: 'These are custom terms and conditions for the booth.'
      };

      const res = await api.put(`/venue/booth/${responseData.boothsIds[0] ?? supportMockData.boothId}/customterms`)
        .set('Cookie', cookie)
        .send(customTermsPayload);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('GET /venue/:accountId/booth/:boothId - should get booth by identity', async () => {
      const res = await api.get(`/venue/${currentUser.userAccountIdentity}/booth/${responseData.boothsIds[0] ?? supportMockData.boothId}`)
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
      expect(res.body.data.key).to.equal(responseData.boothsIds[0] ?? supportMockData.boothId);
    });

    it('GET /venue/:accountId - should get account with owner', async () => {
      const res = await api.get(`/venue/${currentUser.userAccountIdentity}`)
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('POST /venue/:accountId - should update account', async () => {
      const updateAccountPayload = {
        accountName: 'Updated Account Name',
        ownerEmail: currentUser.userEmail
      };

      const res = await api.post(`/venue/${currentUser.userAccountIdentity}`)
        .set('Cookie', cookie)
        .send(updateAccountPayload);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
      expect(res.body.data?.account?.identity).to.equal(currentUser.userAccountIdentity);
    });

    it('GET /venue/:accountId/booth/:boothId/push/v1 - should push pusher event', async () => {
      const res = await api.get(`/venue/${currentUser.userAccountIdentity}/booth/${responseData.boothsIds[0] ?? supportMockData.boothId}/push/v1?q=updateBooth`)
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.be.oneOf(['success', 'failed']);

      if (res.body.result === 'failed') {
        expect(res.body.data.message).to.equal(`booth [${responseData.boothsIds[0] ?? supportMockData.boothId}] offline`);
      }
    });

    it('GET /venue - should return health check', async () => {
      const res = await api.get('/venue').set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });

    it('DELETE /venue/:accountId/booth/:boothId - should archive booth', async () => {
      // Create a test booth first to archive
      const boothPayload = {
        boothName: 'Test Booth To Archive'
      };

      const createRes = await api.post(`/venue/${currentUser.userAccountIdentity}/booth/`)
        .set('Cookie', cookie)
        .send(boothPayload);

      if (createRes.status === 200 || createRes.status === 201) {
        const boothId = createRes.body.data?.key;
        if (boothId) {
          const res = await api.delete(`/venue/${currentUser.userAccountIdentity}/booth/${boothId}`)
            .set('Cookie', cookie);

          expect(res.status).to.equal(200);
          expect(res.body.result).to.equal('success');
        }
      }
    });

    it('GET /venue/test/test - should return test response', async () => {
      const res = await api.get('/venue/test/test').set('Cookie', cookie);

      expect(res.status).to.equal(200);
    });
  });

  describe('Visitor Endpoints', function () {
    it('GET /visitor/:visitorId - should get visitor by ID', async () => {
      const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
      const res = await api.get(`/visitor/${visitorId}`).set('Cookie', cookie);
      expect(res.status).to.equal(200);
      expect(res.body.key).to.equal(visitorId);
    });

    it('POST /visitor - should create visitor', async () => {
      const visitorData = {
        email: 'visitor@example.com',
        boothId: responseData.boothsIds[0] ?? supportMockData.boothId
      };
      const res = await api
        .post('/visitor')
        .set('Cookie', cookie)
        .send(visitorData);
      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('POST /visitor/:visitorId/makePrimaryFace/:actionId - should make primary face by action ID', async () => {
      const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
      const actionId = supportMockData.actionId;
      const res = await api
        .post(`/visitor/${visitorId}/makePrimaryFace/${actionId}`)
        .set('Cookie', cookie);

      expect(res.status).to.be.oneOf([200, 404]);
    });

    it('POST /visitor/:visitorId/makePrimaryFaceById/:faceId - should make primary face by face ID', async () => {
      const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
      const faceId = 'test-face-id-123';
      const res = await api
        .post(`/visitor/${visitorId}/makePrimaryFaceById/${faceId}`)
        .set('Cookie', cookie);

      expect(res.status).to.be.oneOf([200, 404]);
    });

    it('GET /visitor/:visitorId/resetPrimaryFace/:faceIdentityId - should reset primary face', async () => {
      const visitorId = accountVisitors?.[0]?.key ?? supportMockData.visitorId;
      const faceIdentityId = 'test-face-identity-123';
      const res = await api
        .get(`/visitor/${visitorId}/resetPrimaryFace/${faceIdentityId}`)
        .set('Cookie', cookie);

      expect(res.status).to.be.oneOf([200, 404]);
    });

    it('POST /visitor/external - should save external visitor', async () => {
      const externalVisitorData = {
        boothId: responseData.boothsIds[0] ?? supportMockData.boothId,
        email: 'external@example.com',
        firstName: 'External',
        lastName: 'Visitor'
      };
      const res = await api
        .post('/visitor/external')
        .set('Cookie', cookie)
        .send(externalVisitorData);
      expect(res.status).to.equal(200);
    });
  });

  describe('WebHook Endpoints', function () {
    it('POST /hook/sendgrid - should handle sendgrid webhook', async () => {
      const sendgridData = {
        event: 'delivered',
        email: 'test@example.com',
        timestamp: Math.floor(Date.now() / 1000),
        'smtp-id': '<test@smtp-id.sendgrid.net>',
        sg_event_id: 'test-event-id',
        sg_message_id: 'test-message-id'
      };

      const res = await api.post('/hook/sendgrid')
        .set('Cookie', cookie)
        .send(sendgridData);

      expect(res.status).to.be.oneOf([200, 404]);
    });

    it('POST /hook/clearbit - should handle clearbit webhook', async () => {
      const clearbitData = {
        id: 'test-clearbit-id',
        type: 'person',
        body: {
          person: {
            id: 'test-person-id',
            name: {
              fullName: 'Test Person'
            },
            email: 'test@example.com'
          }
        }
      };

      const res = await api.post('/hook/clearbit')
        .set('Cookie', cookie)
        .send(clearbitData);

      expect(res.status).to.be.oneOf([200, 404]);
    });
  });

  describe('Session Endpoints', function () {
    it('POST /sessions - should authenticate user', async () => {
      const loginData = {
        email: process.env.EMAIL,
        password: process.env.PASSWORD
      };

      const res = await api.post('/sessions')
        .send(loginData);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
      expect(res.body.data).to.have.property('userIdentity');
    });

    it('GET /sessions/current - should get current session', async () => {
      const res = await api.get('/sessions/current')
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });
  });

  describe('Internal Search Endpoints', function () {
    it('GET /internal/search/cities-and-categories - should get cities and categories', async () => {
      const res = await api.get('/internal/search/cities-and-categories')
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('cities');
      expect(res.body).to.have.property('categories');
    });

    it('GET /internal/search - should get locations by city', async () => {
      const res = await api.get('/internal/search?city=New York')
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('GET /internal/search/booth/:boothId - should get by booth identity', async () => {
      const boothId = responseData.boothsIds[0] ?? supportMockData.boothId;
      const res = await api.get(`/internal/search/booth/${boothId}`)
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('totalCount');
    });
  });

  describe('Public Endpoints', function () {
    it('GET /public/stats - should get public statistics', async () => {
      const res = await api.get('/public/stats');

      console.log('should get public statistics', res.body);
      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });

    it('GET /public/share/:actionId - should get public share by action ID', async () => {
      const actionId = supportMockData.actionId;
      const res = await api.get(`/public/share/${actionId}`);

      expect(res.status).to.be.oneOf([200, 404]);
      expect(res.body.result).to.be.oneOf(['success', 'not found']);
    });

    it('GET /public/share/video/:videoId - should get public share by video ID', async () => {
      const videoId = supportMockData.videoId;
      const res = await api.get(`/public/share/video/${videoId}`);

      expect(res.status).to.be.oneOf([200, 404]);
      expect(res.body.result).to.be.oneOf(['success', 'not found']);
    });
  });

  describe('Logout Endpoints', function () {
    it('POST /logout - should logout user', async () => {
      const res = await api.post('/logout')
        .set('Cookie', cookie);

      expect(res.status).to.equal(200);
      expect(res.body.result).to.equal('success');
    });
  });
});