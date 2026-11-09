/**
 * CATEGORY ROUTES
 */
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, optionalToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Công khai lấy danh sách danh mục
router.get('/', optionalToken, categoryController.getCategories);

// Chỉ Admin mới được thêm/sửa/xóa danh mục
router.post('/', authenticateToken, authorizeRoles('admin'), categoryController.createCategory);
router.put('/:id', authenticateToken, authorizeRoles('admin'), categoryController.updateCategory);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), categoryController.deleteCategory);

module.exports = router;
