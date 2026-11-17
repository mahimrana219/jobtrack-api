const router = require('express').Router();
const ctrl = require('../controllers/application.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const schemas = require('../validators/schemas');

router.use(protect);

router.get('/stats', ctrl.stats);
router
  .route('/')
  .get(validate(schemas.listQuery, 'query'), ctrl.list)
  .post(validate(schemas.createApplication), ctrl.create);
router
  .route('/:id')
  .get(ctrl.getOne)
  .patch(validate(schemas.updateApplication), ctrl.update)
  .delete(ctrl.remove);

module.exports = router;
