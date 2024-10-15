"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 70000,
    equity: 0.02,
    companyHandle: "c1",
  };

  test("ok for admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "new",
        salary: 70000,
        equity: "0.02",
        companyHandle: "c1",
      },
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "new",
        salary: 70000,
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "new",
        salary: "big",
        equity: 0.02,
        companyHandle: "c1",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("forbidden for user that's not admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("unauth if no logged-in user", async function () {
    const resp = await request(app).post("/jobs").send(newJob);
    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
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
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app).get("/jobs");
    expect(resp.statusCode).toEqual(500);
  });

  test("works for search - all three valid fields", async function () {
    const resp = await request(app).get(
      "/jobs/?title=j&minSalary=55000&hasEquity=true"
    );
    expect(resp.body).toEqual({
      jobs: [
        {
          id: 2,
          title: "j2",
          salary: 60000,
          equity: "0.01",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("works for search - title only", async function () {
    const resp = await request(app).get("/jobs/?title=1");
    expect(resp.body).toEqual({
      jobs: [
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
      ],
    });
  });

  test("works for search - minSalary only", async function () {
    const resp = await request(app).get("/jobs/?minSalary=65000");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: 4,
          title: "j1",
          salary: 70000,
          equity: "0",
          companyHandle: "c2",
        },
      ],
    });
  });

  test("works for search - hasEquity=true", async function () {
    const resp = await request(app).get("/jobs/?hasEquity=true");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: 2,
          title: "j2",
          salary: 60000,
          equity: "0.01",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("works for search - hasEquity=false (alone)", async function () {
    const resp = await request(app).get("/jobs/?hasEquity=false");
    expect(resp.body).toEqual({
      jobs: [
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
      ],
    });
  });

  test("works for search - hasEquity=false and another term", async function () {
    const resp = await request(app).get("/jobs/?hasEquity=false&title=2");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: 2,
          title: "j2",
          salary: 60000,
          equity: "0.01",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("400 for invalid search field", async function () {
    const resp = await request(app).get("/jobs/?name=j");
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message[0]).toContain(
      `\"name\" exists in instance when not allowed`
    );
  });

  test("400 one valid and one invalid search field", async function () {
    const resp = await request(app).get("/jobs/?minSalary=50000&name=j");
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message[0]).toContain(
      `\"name\" exists in instance when not allowed`
    );
  });
});

/************************************** GET /companies/:handle */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/1`);
    expect(resp.body).toEqual({
      job: {
        id: 1,
        title: "j1",
        salary: 50000,
        equity: "0",
        companyHandle: "c1",
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        title: "j1-new",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({
      job: {
        id: 1,
        title: "j1-new",
        salary: 50000,
        equity: "0",
        companyHandle: "c1",
      },
    });
  });

  test("forbidden for user that's not admin", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        title: "j1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/jobs/1`).send({
      title: "j1-new",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found - no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/0`)
      .send({
        title: "new",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        id: "25",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        salary: "high",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .delete(`/jobs/1`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({ deleted: "1" });
  });

  test("forbidden for user that's not admin", async function () {
    const resp = await request(app)
      .delete(`/jobs/1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/jobs/1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/jobs/0`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});