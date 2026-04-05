const express = require('express');
const router = express.Router();
const materialController = require('./material.controller');
const auth = require('../../middleware/auth.middleware');
const { isMentor } = require('../../middleware/role.middleware');
const { upload: materialUpload } = require('../../middleware/materialUpload.middleware');

/**
 * Material Hub Routes
 * Base path: /api/materials
 */

// Create a material (upload)
router.post('/', auth, isMentor, materialUpload.single('file'), materialController.createMaterial);

// Get all materials
router.get('/', materialController.getMaterials);

// Get my materials
router.get('/my', auth, isMentor, materialController.getMyMaterials);

// Delete a material
router.delete('/:id', auth, isMentor, materialController.deleteMaterial);

module.exports = router;
