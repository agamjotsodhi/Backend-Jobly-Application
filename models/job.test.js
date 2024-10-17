"use strict";

const { NotFoundError, BadRequestError } = require("../expressError");
const db = require("../db.js");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "Software Engineer",
    salary: 120000,
    equity: "0.05",
    companyHandle: "c1",
  };

  test("successfully creates a new job", async function () {
    const job = await Job.create(newJob);
    expect(job).toEqual({
      ...newJob,
      id: expect.any(Number),
    });
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("returns all jobs without filters", async function () {
    const jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: testJobIds[0],
        title: "Job1",
        salary: 50000,
        equity: "0",
        companyHandle: "c1",
        companyName: "C1",
      },
      {
        id: testJobIds[1],
        title: "Job2",
        salary: 60000,
        equity: "0.1",
        companyHandle: "c2",
        companyName: "C2",
      },
    ]);
  });

  test("filters jobs by minimum salary", async function () {
    const jobs = await Job.findAll({ minSalary: 55000 });
    expect(jobs).toEqual([
      {
        id: testJobIds[1],
        title: "Job2",
        salary: 60000,
        equity: "0.1",
        companyHandle: "c2",
        companyName: "C2",
      },
    ]);
  });

  test("filters jobs by equity", async function () {
    const jobs = await Job.findAll({ hasEquity: true });
    expect(jobs).toEqual([
      {
        id: testJobIds[1],
        title: "Job2",
        salary: 60000,
        equity: "0.1",
        companyHandle: "c2",
        companyName: "C2",
      },
    ]);
  });

  test("filters jobs by title", async function () {
    const jobs = await Job.findAll({ title: "Job1" });
    expect(jobs).toEqual([
      {
        id: testJobIds[0],
        title: "Job1",
        salary: 50000,
        equity: "0",
        companyHandle: "c1",
        companyName: "C1",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("retrieves a job by its ID", async function () {
    const job = await Job.get(testJobIds[0]);
    expect(job).toEqual({
      id: testJobIds[0],
      title: "Job1",
      salary: 50000,
      equity: "0",
      company: {
        handle: "c1",
        name: "C1",
        description: "Company 1 description",
        numEmployees: 100,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("throws NotFoundError if job not found", async function () {
    try {
      await Job.get(9999); // Non-existent job ID
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "Updated Title",
    salary: 70000,
    equity: "0.15",
  };

  test("updates a job with valid data", async function () {
    const job = await Job.update(testJobIds[0], updateData);
    expect(job).toEqual({
      id: testJobIds[0],
      companyHandle: "c1",
      ...updateData,
    });
  });

  test("throws NotFoundError if job does not exist", async function () {
    try {
      await Job.update(9999, { title: "test" }); // Non-existent job ID
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("throws BadRequestError if no data provided", async function () {
    try {
      await Job.update(testJobIds[0], {}); // No data to update
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("successfully removes a job", async function () {
    await Job.remove(testJobIds[0]);
    const res = await db.query(
      "SELECT id FROM jobs WHERE id=$1", 
      [testJobIds[0]]
    );
    expect(res.rows.length).toEqual(0); // Confirm job was deleted
  });

  test("throws NotFoundError if job does not exist", async function () {
    try {
      await Job.remove(9999); // Non-existent job ID
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
