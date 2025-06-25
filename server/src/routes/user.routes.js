const express = require('express')
const router = express.Router()
const {getUserList, postUser, updateUser, updateActiveUser, updateAdminUser, getUserById, findUser} = require('../controllers/user.controller')

router.get('/users', getUserList)
router.get('/user/:id', getUserById)
router.get('/user', findUser)
router.post('/user', postUser)
router.put('/user/:id', updateUser)
router.patch('/useractive/:id', updateActiveUser)
router.patch('/useradmin/:id', updateAdminUser)

module.exports = router