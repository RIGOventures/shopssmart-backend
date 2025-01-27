const { validationResult } = require('express-validator');

const { ResultCode } = require('@/utils/result')

export class ResultError extends Error {
    resultCode?: string
    constructor(message: string, resultCode?: string) {
        super(message)
        this.resultCode = resultCode
    }
}

export const reportValidationError = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            type: 'error',
            errors: errors.array()
        });
    }

    return next();
};