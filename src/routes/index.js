const { Router } = require('express');
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');


const router = Router();
const dogsRoute = require('./dogsRoute');
const temperamentsRoute = require('./temperamentsRoute');
// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);
router.use('/dogs', dogsRoute);
router.use('/temperaments',temperamentsRoute );



module.exports = router;
