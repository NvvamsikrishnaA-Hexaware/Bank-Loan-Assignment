const Joi = require('@hapi/joi')
const schemas = {
    createUser: Joi.object().keys({
        acno: Joi.number().required(),
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),
    loginSchema: Joi.object().keys({
        email: Joi.string().required(),
        password: Joi.string().required()
    }),
    loanSchema: Joi.object().keys({
        requiredAmount: Joi.number().required(),
        purpose: Joi.string().required(),
        description: Joi.string().required()
    }),
    statusUpdate: Joi.object().keys({
        updateStatus: Joi.string().valid('processed','approved','rejected').required()
    })
};
module.exports = schemas;