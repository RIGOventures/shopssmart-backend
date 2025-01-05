const { validationResult } = require('express-validator');

const { ResultCode } = require('@/utils/result')

const reportValidationError = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            type: 'error',
            errors: errors.array() ,
            resultCode: ResultCode.UnknownError
        });
    }

    return next();
};

module.exports = reportValidationError;