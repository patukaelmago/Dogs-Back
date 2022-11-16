const { Router } = require('express');
const router = Router();
const { Dog, Temperament } = require('../db')
const axios = require('axios');

router.get('/', async (req, res) => {
    let infoApi = await axios(`https://api.thedogapi.com/v1/breeds?live_pE8PgnzSZLtTCj2UwX3XPmbk5gmwL0BYfvGpeHlfYNPZwWhObxyDUPSRY7m5UL6O`);
    let tempsRepeated = infoApi.data.map(el => el.temperament).toString();
    tempsRepeated = await tempsRepeated.split(',');
    const tempsConEspacio = await tempsRepeated.map(el => {
        if (el[0] == ' ') {
            return el.split('');
        }
        return el;
    });
    const tempsSinEspacio = await tempsConEspacio.map(el => {
        if (Array.isArray(el)) {
            el.shift();
            return el.join('');
        }
        return el;
    })

    await tempsSinEspacio.forEach(el => {
        if (el != '') {
            Temperament.findOrCreate({
                where: {
                    name: el
                },
            });
        }
    });
    const allTemps = await Temperament.findAll();
    res.status(200).send(allTemps);
});

module.exports = router;