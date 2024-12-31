const { validationResult } = require('express-validator');

const reportValidationError = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    return next();
};

module.exports = reportValidationError;