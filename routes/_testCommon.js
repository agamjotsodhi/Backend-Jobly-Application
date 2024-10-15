"use strict";

const db = require("../db.js");
const User = require("../models/user");
const Company = require("../models/company");
const Job = require("../models/job");
const { createToken } = require("../helpers/tokens");

let testJobIds = [];

async function commonBeforeAll() {
  // Clean up existing data
  await db.query("DELETE FROM users");
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM jobs");

  // Create test companies
  await Company.create({
    handle: "c1",
    name: "C1",
    numEmployees: 1,
    description: "Desc1",
    logoUrl: "http://c1.img",
  });
  await Company.create({
    handle: "c2",
    name: "C2",
    numEmployees: 2,
    description: "Desc2",
    logoUrl: "http://c2.img",
  });
  await Company.create({
    handle: "c3",
    name: "C3",
    numEmployees: 3,
    description: "Desc3",
    logoUrl: "http://c3.img",
  });

  // Create test jobs and store their IDs
  testJobIds[0] = (await Job.create(
    { title: "J1", salary: 1, equity: "0.1", companyHandle: "c1" })).id;
  testJobIds[1] = (await Job.create(
    { title: "J2", salary: 2, equity: "0.2", companyHandle: "c1" })).id;
  testJobIds[2] = (await Job.create(
    { title: "J3", salary: 3, /* equity null */ companyHandle: "c1" })).id;
  // Store job IDs in the testJobIds array for later use in tests
  testJobIds = jobResults.rows.map(row => row.id);

  // Create test users
  await User.register({
    username: "u1",
    firstName: "U1F",
    lastName: "U1L",
    email: "user1@user.com",
    password: "password1",
    isAdmin: false,
  });
  await User.register({
    username: "u2",
    firstName: "U2F",
    lastName: "U2L",
    email: "user2@user.com",
    password: "password2",
    isAdmin: false,
  });
  await User.register({
    username: "u3",
    firstName: "U3F",
    lastName: "U3L",
    email: "user3@user.com",
    password: "password3",
    isAdmin: false,
  });
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

const u1Token = createToken({ username: "u1", isAdmin: false });

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  testJobIds, // Exporting testJobIds to be used in tests
};
