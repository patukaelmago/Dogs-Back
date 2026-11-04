const assert = require('assert');
const axios = require('axios');
const request = require('supertest');
const dbPath = require.resolve('../src/db');
const controllerPath = require.resolve('../src/controller/dogsController');
const originalGet = axios.get;
const storedDb = require.cache[dbPath];
let dbFailure = false;
let seededNames = [];
let attached = false;
const fakeDb = {
  Dog: {
    findAll: async () => { if (dbFailure) throw new Error('Database unavailable'); return []; },
    create: async () => ({ addTemperament: async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); attached = true;
    } }),
  },
  Temperament: {
    findOrCreate: async ({ where }) => { await new Promise(resolve => setTimeout(resolve, 5)); seededNames.push(where.name); },
    findAll: async () => seededNames.map(name => ({ name })),
  },
  conn: { authenticate: async () => { if (dbFailure) throw new Error('offline'); } },
};
const breeds = [
  { id: 1, name: 'Pug', temperament: 'Playful, Friendly', weight: { metric: '6 - 8' }, height: { metric: '25 - 30' }, image: { url: 'https://example.com/pug.png' } },
  { id: 2, name: 'Terrier', reference_image_id: 'missing-image', weight: { metric: '10' } },
];
let calls;
function freshController() {
  delete require.cache[controllerPath];
  return require(controllerPath);
}

before(() => {
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
});
after(() => {
  axios.get = originalGet;
  if (storedDb) require.cache[dbPath] = storedDb; else delete require.cache[dbPath];
});
beforeEach(() => { calls = []; dbFailure = false; });

describe('Backend failure regressions (isolated external services)', () => {
  it('shares one catalogue request, tolerates a broken image and normalizes incomplete breed data', async () => {
    axios.get = async url => {
      calls.push(url);
      if (url.includes('/images/')) throw new Error('Image missing');
      await new Promise(resolve => setTimeout(resolve, 5));
      return { data: breeds };
    };
    const controller = freshController();
    const [first, second] = await Promise.all([controller.getApiDogs(), controller.getApiDogs()]);
    assert.strictEqual(first, second);
    assert.equal(calls.filter(url => url.endsWith('/breeds')).length, 1);
    assert.equal(first[0].image, 'https://example.com/pug.png');
    assert.equal(first[1].weightMax, 10);
    assert.deepEqual(first[1].temperaments, []);
    assert.equal(first[1].image, '');
    await controller.getApiDogs();
    assert.equal(calls.length, 2);
  });

  it('returns a retryable gateway error on upstream failure and retries successfully', async () => {
    const controller = freshController();
    axios.get = async () => { throw new Error('API unavailable'); };
    await assert.rejects(controller.getApiDogs(), error => error.status === 502);
    axios.get = async () => ({ data: [breeds[0]] });
    assert.equal((await controller.getApiDogs()).length, 1);
  });

  it('handles route rejections without crashing and waits for temperament persistence', async () => {
    axios.get = async () => ({ data: [breeds[0]] });
    freshController();
    for (const file of ['../src/app', '../src/routes', '../src/routes/dogsRoute', '../src/routes/temperamentsRoute']) {
      delete require.cache[require.resolve(file)];
    }
    const app = require('../src/app');
    axios.get = async () => { throw new Error('Rate limited'); };
    await request(app).get('/temperaments').expect(502);
    await request(app).get('/dogs').expect(502);
    axios.get = async () => ({ data: [breeds[0]] });
    await request(app).get('/dogs?name=pug').expect(200).then(res => assert.equal(res.body[0].name, 'Pug'));
    await request(app).get('/dogs/1').expect(200);
    await request(app).get('/dogs/unknown').expect(404);
    await request(app).get('/temperaments').expect(200).then(res => assert.equal(res.body.length, 2));
    const count = seededNames.length;
    await request(app).get('/temperaments').expect(200);
    assert.equal(seededNames.length, count);
    await request(app).post('/dogs').send({ name: 'Test', temperaments: ['Friendly'] }).expect(200);
    assert.equal(attached, true);
    await request(app).options('/dogs').set('Origin', 'https://example.com').set('Access-Control-Request-Method', 'POST').expect(204);
    dbFailure = true;
    await request(app).get('/dogs').expect(500);
    await request(app).get('/dogs/1').expect(500);
    await request(app).get('/health').expect(503);
    dbFailure = false;
    await request(app).get('/health').expect(200);
  });

  it('starts the server only after non-destructive schema initialization', async () => {
    const appPath = require.resolve('../src/app');
    const originalApp = require.cache[appPath];
    const originalSync = fakeDb.conn.sync;
    let resolveSync;
    let syncOptions;
    let listening = false;
    fakeDb.conn.sync = options => {
      syncOptions = options;
      return new Promise(resolve => { resolveSync = resolve; });
    };
    require.cache[appPath] = { id: appPath, filename: appPath, loaded: true, exports: { listen: () => { listening = true; } } };
    try {
      delete require.cache[require.resolve('../index')];
      require('../index');
      assert.equal(listening, false);
      assert(!syncOptions || !syncOptions.force);
      resolveSync();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(listening, true);
    } finally {
      require.cache[appPath] = originalApp;
      fakeDb.conn.sync = originalSync;
    }
  });
});
