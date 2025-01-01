const { validationResult } = require('express-validator');

const { ResultCode } = require('@/utils/result')

const reportValidationError = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            errors: errors.array() ,
            resultCode: ResultCode.InvalidSubmission
        });
    }

    return next();
};

module.exports = reportValidationError;