"use strict";

/** Convenience middleware to handle common authentication and authorization cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError, ForbiddenError } = require("../expressError");

/** Middleware: Authenticate user.
 *
 * If a token is provided, verify it. If valid, store the token payload
 * on `res.locals.user` (this will include fields like `username` and `isAdmin`).
 *
 * It's not an error if no token is provided or if the token is invalid.
 */
function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware: Ensure the user is logged in.
 *  
 * If not logged in, raise `UnauthorizedError`.
 */
function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware: Ensure the user is an admin.
 *  
 * If not logged in or not an admin, raise `UnauthorizedError`.
 */
function ensureAdmin(req, res, next) {
  if (!res.locals.user || !res.locals.user.isAdmin) {
    return next(new UnauthorizedError());
  }
  next();
}

/** Middleware: Ensure the user is either an admin or the user whose data is being accessed.
 *
 * If not logged in, raise `UnauthorizedError`.
 * If logged in but neither an admin nor the correct user, raise `ForbiddenError`.
 */
function ensureAdminOrSelf(req, res, next) {
  try {
    if (!res.locals.user) {
      throw new UnauthorizedError();
    }

    const username = res.locals.user.username;
    const isAdmin = res.locals.user.isAdmin;

    if (!isAdmin && username !== req.params.username) {
      throw new ForbiddenError();
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureAdminOrSelf,
};
