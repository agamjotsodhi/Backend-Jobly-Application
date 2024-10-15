"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

describe("create job", function () {
  test("works", async function () {
    const newJob = {
      title: "new",
      salary: 70000,
      equity: 0.02,
      companyHandle: "c1",
    };

    const job = await Job.create(newJob);

    expect(job.title).toEqual(newJob.title);
    expect(job.salary).toEqual(newJob.salary);
    expect(Number(job.equity)).toEqual(newJob.equity);
    expect(job.companyHandle).toEqual(newJob.companyHandle);

    const result = await db.query(
      `SELECT id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${job.id}`
    );
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "new",
        salary: 70000,
        equity: "0.02",
        companyHandle: "c1",
      },
    ]);
  });

  test("bad request with invalid handle", async function () {
    try {
      const newJob = {
        title: "new",
        salary: 70000,
        equity: 0.02,
        companyHandle: "c4",
      };
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll jobs", function () {
  test("works", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: 1,
        title: "j1",
        salary: 50000,
        equity: "0",
        companyHandle: "c1",
      },
      {
        id: 2,
        title: "j2",
        salary: 60000,
        equity: "0.01",
        companyHandle: "c1",
      },
      {
        id: 3,
        title: "j3",
        salary: 40000,
        equity: "0",
        companyHandle: "c2",
      },
      {
        id: 4,
        title: "j1",
        salary: 70000,
        equity: "0",
        companyHandle: "c2",
      },
    ]);
  });
});

/************************************** searchAll */

describe("searchAll jobs", function () {
  test("works with title only", async function () {
    const fields = { title: "1" };
    let jobs = await Job.searchAll(fields);
    expect(jobs).toEqual([
      {
        id: 1,
        title: "j1",
        salary: 50000,
        equity: "0",
        companyHandle: "c1",
      },
      {
        id: 4,
        title: "j1",
        salary: 70000,
        equity: "0",
        companyHandle: "c2",
      },
    ]);
  });

  test("works with hasEquity only", async function () {
    const fields = { hasEquity: true };
    let jobs = await Job.searchAll(fields);
    expect(jobs).toEqual([
      {
        id: 2,
        title: "j2",
        salary: 60000,
        equity: "0.01",
        companyHandle: "c1",
      },
    ]);
  });

  test("works with minSalary only", async function () {
    const fields = { minSalary: 65000 };
    let jobs = await Job.searchAll(fields);
    expect(jobs).toEqual([
      {
        id: 4,
        title: "j1",
        salary: 70000,
        equity: "0",
        companyHandle: "c2",
      },
    ]);
  });

  test("hasEquity=false is ignored", async function () {
    const fields = { minSalary: 55000, hasEquity: false };
    let jobs = await Job.searchAll(fields);
    expect(jobs).toEqual([
      {
        id: 2,
        title: "j2",
        salary: 60000,
        equity: "0.01",
        companyHandle: "c1",
      },
      {
        id: 4,
        title: "j1",
        salary: 70000,
        equity: "0",
        companyHandle: "c2",
      },
    ]);
  });

  test("works with all three fields", async function () {
    const fields = { title: "j", minSalary: 55000, hasEquity: true };
    let jobs = await Job.searchAll(fields);
    expect(jobs).toEqual([
      {
        id: 2,
        title: "j2",
        salary: 60000,
        equity: "0.01",
        companyHandle: "c1",
      },
    ]);
  });
});

/************************************** get */

describe("get job", function () {
  test("works", async function () {
    let job = await Job.get(1);
    expect(job).toEqual({
      id: 1,
      title: "j1",
      salary: 50000,
      equity: "0",
      companyHandle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update job", function () {
  const updateData = {
    title: "new",
    salary: 100000,
    equity: 0.02,
  };

  test("works", async function () {
    let job = await Job.update(1, updateData);
    expect(job).toEqual({
      id: 1,
      title: "new",
      salary: 100000,
      equity: "0.02",
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id,
          title,
          salary,
          equity,
          company_handle AS "companyHandle"
      FROM jobs
      WHERE id = 1`
    );
    expect(result.rows).toEqual([
      {
        id: 1,
        title: "new",
        salary: 100000,
        equity: "0.02",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "new",
      salary: null,
      equity: null,
    };

    let job = await Job.update(1, updateDataSetNulls);
    expect(job).toEqual({
      id: 1,
      ...updateDataSetNulls,
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id,
          title,
          salary,
          equity,
          company_handle AS "companyHandle"
      FROM jobs
      WHERE id = 1`
    );
    expect(result.rows).toEqual([
      {
        id: 1,
        title: "new",
        salary: null,
        equity: null,
        companyHandle: "c1",
      },
    ]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(0, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove job", function () {
  test("works", async function () {
    await Job.remove(1);
    const res = await db.query("SELECT id FROM jobs WHERE id=1");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});