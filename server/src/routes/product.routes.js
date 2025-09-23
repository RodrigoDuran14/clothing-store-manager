const express = require('express')
const router = express.Router()
const {postProduct, getProductsList } = require('../controllers/product.controller')
const {validatePostProduct} = require('../validators/product.validator')

router.post('/product', validatePostProduct, postProduct)
router.get('/products', getProductsList)


module.exports = router