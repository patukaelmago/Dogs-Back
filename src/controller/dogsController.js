const axios = require('axios');
// const { API_KEY, URL_DOGS } = process.env;
const {Dog, Temperament } = require('../db');
require('dotenv').config();


async function getApiDogs(){
       const dogsApi = await axios.get(`https://api.thedogapi.com/v1/breeds?live&limit=24&page=0_pE8PgnzSZLtTCj2UwX3XPmbk5gmwL0BYfvGpeHlfYNPZwWhObxyDUPSRY7m5UL6O`)
        const dogs = await dogsApi.data.map(dogs => {return axios.get(`https://api.thedogapi.com/v1/images/${dogs.reference_image_id}`)});
        const dogsPromise = await Promise.all(dogs);  
        const result = dogsPromise.map(d =>d.data)

        const getApiInfo = await dogsApi?.data.map((d) => {
         return {
                        id:d.id,
                        name:d.name,
                        image:result.find(({id}) => id == d.reference_image_id).url,
                        temperaments: typeof(d.temperament) === 'string'? d.temperament.split(', '):d.temperament ,
                        lifespan:d.life_span,
                        weightMin:Number.isNaN(parseInt(d.weight.metric.split(' - ')[0]))  ? 20 :parseInt(d.weight.metric.split(' - ')[0]),
                        weightMax:Number.isNaN(parseInt(d.weight.metric.split(' - ')[1]))  ? 50 : parseInt(d.weight.metric.split(' - ')[1]),
                        heightMin:Number.isNaN(parseInt(d.height.metric.split(' - ')[0])) ? 1 :parseInt(d.height.metric.split(' - ')[0]),
                        heightMax:Number.isNaN(parseInt(d.height.metric.split(' - ')[1])) ? 10 : parseInt(d.height.metric.split(' - ')[1]),
                        createdInDb: false
                    }
                });
    return getApiInfo;
            }


async function getDbDogs(){
    return await Dog.findAll({
        include:{
            model:Temperament,
            attributes: ['name'],
            through: {
                attributes: [],
            }
        }
    });
}

const getAllDogs = async () => {
    const apiInfo = await getApiDogs();
    const dbInfo = await getDbDogs();
    const infoTotal = apiInfo.concat(dbInfo);
    return infoTotal; 
}

module.exports={
    getApiDogs,
    getDbDogs,
    getAllDogs
}