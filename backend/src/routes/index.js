const express = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const { controlDevice } = require('../controllers/deviceController');
const { getSensorHistory } = require('../controllers/dataSensorController');
const { getActionHistory } = require('../controllers/actionHistoryController');
const { getProfile } = require('../controllers/profileController');

const router = express.Router();

router.get('/dashboard', getDashboard);
router.post('/devices/control', controlDevice);
router.get('/data-sensor', getSensorHistory);
router.get('/action-history', getActionHistory);
router.get('/profile', getProfile);

module.exports = router;
