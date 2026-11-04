const { Router } = require('express');
const { Temperament } = require('../db');
const { getApiDogs } = require('../controller/dogsController');
const router = Router();
let seeding;
let seeded = false;

router.get('/', async (req, res, next) => {
  try {
    if (!seeded) {
      if (!seeding) {
        seeding = (async () => {
          const dogs = await getApiDogs();
          const names = [...new Set(dogs.flatMap(d => d.temperaments))].sort();
          for (const name of names) await Temperament.findOrCreate({ where: { name } });
          seeded = true;
        })().finally(() => { seeding = null; });
      }
      await seeding;
    }
    const allTemps = await Temperament.findAll({ order: [['name', 'ASC']] });
    res.status(200).json(allTemps);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
