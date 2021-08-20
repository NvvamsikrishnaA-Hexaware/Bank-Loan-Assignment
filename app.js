require('dotenv').config()

const express = require('express')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const schemas = require('./schemas')
const validate = require('./validate')
const passport = require('passport')
const middleware = require('./middleware')(passport)

const app = express()
app.use(express.json())
app.use(passport.initialize())
app.use(passport.session())
let rr = [0, 0, 0, 0]

app.get('/users', (req, res) => {
    try {
        const users = require('./users.json')
        res.status(200).json(users)
    }
    catch {
        res.status(503).send('Service Unavailable')
    }
})

app.post('/user/signup', validate(schemas.createUser), (req, res) => {
    try {
        var data = require('./users.json')
        var dataObj = data
        if (data.some(user => user.email === req.body.email)) {
            res.status(409).send("User already exists")
        }
        else {

            let newUser = {
                acno: req.body.acno,
                email: req.body.email,
                name: req.body.name,
                password: req.body.password,
                role: "customer"
            }

            dataObj.push(newUser)

            var updatedData = JSON.stringify(dataObj)
            fs.writeFile("users.json", updatedData, (err) => {
                if (err) throw err
                console.log("Data updated")
                res.status(201).send("User Registeration Successfull")
            })
        }
    }
    catch {
        res.status(503).send('Service Unavailable')
    }
})

app.post('/user/login', validate(schemas.loginSchema), (req, res) => {
    try {
        const data = require('./users.json')
        if (data.some(user => user.email === req.body.email && user.password === req.body.password)) {
            const user = data.find(user => user.email === req.body.email)
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { algorithm: 'HS512' })
            res.cookie('jwt', accessToken, {
                expires: new Date(Date.now() + 600000),
                httpOnly: true
            })
            res.status(200).json({ accessToken: accessToken })
        }
        else {
            res.status(401).send("Invalid Credentials")
        }
    }
    catch (err) {
        res.status(503).send('Service Unavailable ' + err.message)
    }
})

app.get('/user/details', passport.authenticate('jwt', { session: false }), (req, res) => {
    try {
        const data = require('./users.json')
        res.status(200).json(data.find(user => user.email === req.user.email))
    }
    catch {
        res.status(503).send('Service Unavailable')
    }
})

app.post('/loan', validate(schemas.loanSchema), passport.authenticate('jwt', { session: false }), (req, res) => {
    try {
        if (req.user.role !== "customer") {
            res.status(403).send("Access Denied")
        }
        else {
            var data = require('./loans.json')
            var dataObj = data
            const cr = require('./users.json').slice(1, 5)
            if (rr.indexOf(0) == -1) {
                rr = [0, 0, 0, 0]
            }
            let newLoan = {
                id: dataObj.length + 1,
                acno: JSON.parse(req.user.acno),
                requiredAmount: req.body.requiredAmount,
                purpose: req.body.purpose,
                description: req.body.description,
                crid: cr[rr.indexOf(0)].id,
                status: 'pending',
                approvedAmount: 0,
                sentAt: (new Date()).toISOString().slice(0, 19)
            }
            rr[rr.indexOf(0)] = 1
            // console.log(rr)
            dataObj.push(newLoan)

            var updatedData = JSON.stringify(dataObj)
            fs.writeFile("loans.json", updatedData, (err) => {
                if (err) throw err
                console.log("Loan appiled")
                res.status(201).send("Loan Applied Successfull")
            })
        }
    }
    catch (err) {
        res.status(503).send('Service Unavailable ' + err.message)
    }
})

app.get('/loan', passport.authenticate('jwt', { session: false }), (req, res) => {
    try {
        const data = require('./loans.json')
        if (req.user.role === "manager") {
            if (!req.query.status) {
                res.status(200).json(data)
            }
            else {
                res.status(200).json(data.filter(loan => loan.status === req.query.status))
            }
        }
        else if (req.user.role === "customer") {
            if (!req.query.status) {
                res.status(200).json(data.filter(loan => loan.acno === req.user.acno))
            }
            else {
                res.status(200).json((data.filter(loan => loan.acno === req.user.acno)).filter(loan => loan.status === req.query.status))
            }
        }
        else {
            if (!req.query.status) {
                res.status(200).json(data.filter(loan => loan.crid === req.user.id))
            }
            else {
                res.status(200).json((data.filter(loan => loan.crid === req.user.id)).filter(loan => loan.status === req.query.status))
            }
        }
    }
    catch {
        res.status(503).send('Service Unavailable')
    }
})

app.put('/loan/:id', validate(schemas.statusUpdate), passport.authenticate('jwt', { session: false }), (req, res) => {
    try {
        if (req.user.role === 'customer') {
            res.status(403).send('Access Denied')
        }
        else if (req.user.role === 'manager') {
            if (req.body.updateStatus === 'processed') {
                res.status(400).send('Please provide vaild status code')
            }
            else {
                var data = require('./loans.json')
                var index = data.findIndex(loan => loan.id == parseInt(req.params.id))
                if (data[index].status === 'rejected' || data[index].status === 'approved') {
                    res.status(409).send('Status already updated')
                }
                else if (data[index].status === 'pending') {
                    res.status(400).send('Please wait for CR Manager to process this loan')
                }
                else {
                    data[index].status = req.body.updateStatus
                    fs.writeFile("loans.json", JSON.stringify(data), (err) => {
                        if (err) throw err
                        console.log("Data updated")
                        res.status(200).send("Loan status updated successfully")
                    })
                }
            }
        }
        else {
            if (req.body.updateStatus === 'approved') {
                res.status(400).send('Access Denied, please provide valid status code')
            }
            else {
                var data = require('./loans.json')
                var index = data.findIndex(loan => loan.id == parseInt(req.params.id))
                if (data[index].crid !== req.user.id) {
                    res.status(403).send('Access Denied')
                }
                else if (data[index].status === 'processed' || data[index].status === 'rejected' || data[index].status === 'approved') {
                    res.status(409).send('Status already updated')
                }
                else {
                    data[index].status = req.body.updateStatus
                    fs.writeFile("loans.json", JSON.stringify(data), (err) => {
                        if (err) throw err
                        console.log("Data updated")
                        res.status(200).send("Loan status updated successfully")
                    })
                }
            }
        }
    }
    catch {
        res.status(503).send('Service Unavailable')
    }
})

app.listen(8000)