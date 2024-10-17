"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../expressError");
const { 
  authenticateJWT, 
  ensureLoggedIn, 
  ensureAdmin, 
  ensureAdminOrSelf 
} = require("./auth");

const { SECRET_KEY } = require("../config");

// Sample tokens for testing
const testJwt = jwt.sign({ username: "test", isAdmin: false }, SECRET_KEY);  // Regular user JWT
const adminJwt = jwt.sign({ username: "admin", isAdmin: true }, SECRET_KEY);  // Admin JWT
const badJwt = jwt.sign({ username: "test", isAdmin: false }, "wrong");  // Invalid JWT

/** Tests for `authenticateJWT` */
describe("authenticateJWT", function () {
  test("works: valid token via header", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    const next = (err) => expect(err).toBeFalsy();

    authenticateJWT(req, res, next);

    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        username: "test",
        isAdmin: false,
      },
    });
  });

  test("works: no token provided", function () {
    expect.assertions(2);
    const req = {};
    const res = { locals: {} };
    const next = (err) => expect(err).toBeFalsy();

    authenticateJWT(req, res, next);

    expect(res.locals).toEqual({});
  });

  test("works: invalid token", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    const next = (err) => expect(err).toBeFalsy();

    authenticateJWT(req, res, next);

    expect(res.locals).toEqual({});
  });
});

/** Tests for `ensureLoggedIn` */
describe("ensureLoggedIn", function () {
  test("works: user is logged in", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    const next = (err) => expect(err).toBeFalsy();

    ensureLoggedIn(req, res, next);
  });

  test("unauth: user is not logged in", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: {} };
    const next = (err) => expect(err instanceof UnauthorizedError).toBeTruthy();

    ensureLoggedIn(req, res, next);
  });
});

/** Tests for `ensureAdmin` */
describe("ensureAdmin", function () {
  test("works: user is admin", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "admin", isAdmin: true } } };
    const next = (err) => expect(err).toBeFalsy();

    ensureAdmin(req, res, next);
  });

  test("unauth: user is not admin", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    const next = (err) => expect(err instanceof UnauthorizedError).toBeTruthy();

    ensureAdmin(req, res, next);
  });

  test("unauth: no user", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: {} };
    const next = (err) => expect(err instanceof UnauthorizedError).toBeTruthy();

    ensureAdmin(req, res, next);
  });
});

/** Tests for `ensureAdminOrSelf` */
describe("ensureAdminOrSelf", function () {
  test("works: admin user", function () {
    expect.assertions(1);
    const req = { params: { username: "test" } };
    const res = { locals: { user: { username: "admin", isAdmin: true } } };
    const next = (err) => expect(err).toBeFalsy();

    ensureAdminOrSelf(req, res, next);
  });

  test("works: correct user accessing their own data", function () {
    expect.assertions(1);
    const req = { params: { username: "test" } };
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    const next = (err) => expect(err).toBeFalsy();

    ensureAdminOrSelf(req, res, next);
  });

  test("forbidden: wrong user", function () {
    expect.assertions(1);
    const req = { params: { username: "wrong" } };
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    const next = (err) => expect(err instanceof ForbiddenError).toBeTruthy();

    ensureAdminOrSelf(req, res, next);
  });

  test("unauth: no user", function () {
    expect.assertions(1);
    const req = { params: { username: "test" } };
    const res = { locals: {} };
    const next = (err) => expect(err instanceof UnauthorizedError).toBeTruthy();

    ensureAdminOrSelf(req, res, next);
  });
});
