import { validationResult } from 'express-validator';

import { ResultError } from '@/utils/result'

/* parse and respond to any reported errors */
export default function reportValidationError (req, res, next) {
    // parse errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // return error status
        res.status(400).json({ 
            type: 'error',
            errors: errors.array()
        });
        return 
    }

    return next();
};