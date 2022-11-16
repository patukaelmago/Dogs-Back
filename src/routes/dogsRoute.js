const { Router } = require('express');
const router = Router();
const { getAllDogs } = require('../controller/dogsController');
const { Dog, Temperament } = require('../db');




router.get('/', async(req,res,next)=>{
    const { name } = req.query
    const allDogs = await getAllDogs(); 
    try {    
        if (name) {
           let dogsByName = await allDogs.filter(d => d.name.toLowerCase().includes(name.toLowerCase()))
           dogsByName.length?
           res.send(dogsByName):
           res.status(404).send('Dog not found') 
        } else {
           res.send(allDogs)
        }
    } catch (error) {
        next(error)
    }
})

router.get('/:id', async (req, res, next) => {
    const { id } = req.params;
    const allBreeds = await getAllDogs();
    try {
        if (id) {
        let breed = await allBreeds.filter(b => b.id == id);
        breed.length? 
        res.status(200).json(breed): 
        res.status(404).send(`Sorry, we dont have a breed with ${id} as ID 🤷‍♀️`);
    }
        
    } catch (error) {
        next(error)
    }
})

router.post('/', async (req,res,next) => {
    try {
        let {
        name,
        heightMin,
        heightMax,
        weightMin,
        weightMax,
        lifespan,
        image,
        temperaments   
    } = req.body;
    const breedCreated = await Dog.create({
        name,
        heightMin,
        heightMax,
        weightMin,
        weightMax,
        lifespan,
        image,
       
        
    });
    const temperamentsDB = await Temperament.findAll({
        where: {
            name: temperaments,
        }
    });
    breedCreated.addTemperament(temperamentsDB);
    res.send('🐕 Breed created successfully 🐶')
    } catch (error) {
        next(error)
    }
});


module.exports = router;
