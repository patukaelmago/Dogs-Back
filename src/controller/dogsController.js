const axios = require('axios');
const { Dog, Temperament } = require('../db');

let cachedDogs;
let cachedAt = 0;
let pending;
const CACHE_TTL = 60 * 60 * 1000;

function range(value, fallbackMin, fallbackMax) {
  const numbers = String(value || '').match(/\d+(?:\.\d+)?/g) || [];
  return [Number(numbers[0]) || fallbackMin, Number(numbers[1] || numbers[0]) || fallbackMax];
}

async function fetchDogs() {
  const apiKey = process.env.DOG_API_KEY || process.env.API_KEY;
  const options = { timeout: 15000, headers: apiKey ? { 'x-api-key': apiKey } : {} };
  const { data } = await axios.get('https://api.thedogapi.com/v1/breeds', options);
  if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid breed catalogue');
  const dogs = data.map(d => {
    const [weightMin, weightMax] = range(d.weight?.metric, 20, 50);
    const [heightMin, heightMax] = range(d.height?.metric, 1, 10);
    return {
      id: d.id, name: d.name, image: d.image?.url || '',
      temperaments: typeof d.temperament === 'string' ? d.temperament.split(',').map(t => t.trim()).filter(Boolean) : [],
      lifespan: d.life_span, weightMin, weightMax, heightMin, heightMax, createdInDb: false,
    };
  });
  // Older API responses omit image URLs. Resolve only those images, with bounded concurrency.
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < data.length) {
      const index = next++;
      if (dogs[index].image || !data[index].reference_image_id) continue;
      try {
        const image = await axios.get(`https://api.thedogapi.com/v1/images/${encodeURIComponent(data[index].reference_image_id)}`, { ...options, timeout: 5000 });
        dogs[index].image = image.data.url || '';
      } catch (error) {
        // A missing image must not take down the entire catalogue.
        console.warn('Breed image unavailable:', data[index].id);
      }
    }
  }));
  cachedDogs = dogs;
  cachedAt = Date.now();
  return dogs;
}

async function getApiDogs() {
  if (cachedDogs && Date.now() - cachedAt < CACHE_TTL) return cachedDogs;
  if (!pending) {
    pending = fetchDogs().catch(error => {
      if (cachedDogs) return cachedDogs;
      const unavailable = new Error('The breed catalogue is temporarily unavailable. Please try again.');
      unavailable.status = 502;
      throw unavailable;
    }).finally(() => { pending = null; });
  }
  return pending;
}

async function getDbDogs() {
  return Dog.findAll({
    include: { model: Temperament, attributes: ['name'], through: { attributes: [] } },
  });
}

async function getAllDogs() {
  const [apiInfo, dbInfo] = await Promise.all([getApiDogs(), getDbDogs()]);
  return apiInfo.concat(dbInfo);
}

module.exports = { getApiDogs, getDbDogs, getAllDogs };
