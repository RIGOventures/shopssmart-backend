// middleware to test if authenticated
function isAuthenticated (req, res, next) {
    if (!req.session) {
        throw new Error("Session is not authenticated")
    }

    if (!req.session.userId) {
        throw new Error("Session is invalid")
    }
        
    return next()
}

module.exports = isAuthenticated;