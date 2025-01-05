// middleware to test if authenticated
function isAuthenticated (req, res, next) {
    if (req.session.userId) {
        return next()
    } else {
        return next(new Error("Invalid session"))
    }
}

module.exports = isAuthenticated;