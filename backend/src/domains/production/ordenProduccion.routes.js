const express = require('express');
const ordenProduccionController = require('./ordenProduccion.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

router.get('/', ordenProduccionController.getAll);
router.get('/:id', ordenProduccionController.getById);
router.post('/', ordenProduccionController.create);
router.put('/:id', ordenProduccionController.update);
router.delete('/:id', ordenProduccionController.remove);

module.exports = router;
