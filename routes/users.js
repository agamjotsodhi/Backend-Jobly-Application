"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureAdmin, ensureAdminOrSelf } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const Application = require("../models/application");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");
const applicationSchema = require("../schemas/application.json");

const router = express.Router();

/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: admin
 **/

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});

/** GET / =>
 * { users: [ {username, firstName, lastName, email, jobs: [jobId, ...] }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: admin
 **/

router.get("/", ensureAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin, jobs: [jobId, jobId, ...] }
 *
 * Authorization required: admin or user being accessed
 **/

router.get("/:username", ensureAdminOrSelf, async function (req, res, next) {
  try {
    const user = await User.get(req.params.username);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin, jobs: [jobId, ...] }
 *
 * Authorization required: admin or user being updated
 **/

router.patch("/:username", ensureAdminOrSelf, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: admin or user being deleted
 **/

router.delete("/:username", ensureAdminOrSelf, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});

/** --------------------user job application routes----------------------------- */

/** POST /[username]/jobs/[id] => { applied: id }
 *
 * creates job application
 *
 * Authorization required: admin or user applying
 */

router.post(
  "/:username/jobs/:id",
  ensureAdminOrSelf,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, applicationSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }
      const app = await Application.create(
        req.params.username,
        req.params.id,
        req.body.status
      );
      return res.status(201).json({ applied: app });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET  /[username]/jobs =>
 * { applications: [ {status, jobId, title, salary, equity, companyHandle}, ...] }
 *
 * get all job applications for user
 *
 * Authorization required: admin or applicant
 */

router.get(
  "/:username/jobs",
  ensureAdminOrSelf,
  async function (req, res, next) {
    try {
      const applications = await Application.getByUser(req.params.username);
      return res.json({ applications });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /[username]/job/[id] =>
 * { application: { status, job: { jobId, title, salary, equity, companyHandle },
 *          user: { username, firstName, lastName, email }}}
 *
 * get all details related to job application
 *
 * Authorization required: admin or applicant
 */

router.get(
  "/:username/jobs/:id",
  ensureAdminOrSelf,
  async function (req, res, next) {
    try {
      const application = await Application.get(
        req.params.username,
        req.params.id
      );
      return res.json({ application });
    } catch (err) {
      return next(err);
    }
  }
);

/** PATCH /[username]/jobs/[id] => application: { username, jobId, status}
 *
 * update status of application
 *
 * Authorization required: admin or applicant
 */

router.patch(
  "/:username/jobs/:id",
  ensureAdminOrSelf,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, applicationSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }
      const application = await Application.update(
        req.params.username,
        req.params.id,
        req.body.status
      );
      return res.json({ application });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[username]/jobs/[id] => { deleted: application by username to id }
 *
 * delete application
 *
 * Authorization required: admin or applicant
 */

router.delete(
  "/:username/jobs/:id",
  ensureAdminOrSelf,
  async function (req, res, next) {
    try {
      const application = await Application.remove(req.params.username, req.params.id);
      return res.json({
        deleted: application,
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;