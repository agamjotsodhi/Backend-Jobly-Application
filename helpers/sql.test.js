const { sqlForPartialUpdate, sqlForQuery } = require("./sql");
const { BadRequestError } = require("../expressError");

describe("create sql string for partial update", function () {
  test("create string", function () {
    const { setCols, values } = sqlForPartialUpdate(
      {
        firstName: "Aliya",
        age: 32,
      },
      {
        firstName: "first_name",
        lastName: "last_name",
        isAdmin: "is_admin",
      }
    );
    expect(setCols).toEqual('"first_name"=$1, "age"=$2');
    expect(values).toEqual(["Aliya", 32]);
  });
  test("works if jsToSql is empty", function () {
    const { setCols, values } = sqlForPartialUpdate(
      {
        firstName: "Aliya",
        age: 32,
      },
      {}
    );
    expect(setCols).toEqual('"firstName"=$1, "age"=$2');
    expect(values).toEqual(["Aliya", 32]);
  });
  test("get bad request error if data is empty", function () {
    try {
      const { setCols, values } = sqlForPartialUpdate(
        {},
        {
          firstName: "first_name",
          lastName: "last_name",
          isAdmin: "is_admin",
        }
      );
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

describe("create sql where clause for search", function () {
  test("create string", function () {
    const { whereClause, values } = sqlForQuery(
      { nameLike: "net", minEmployees: 20 },
      {
        nameLike: { colname: "name", operator: "ILIKE" },
        minEmployees: { colname: "num_employees", operator: ">=" },
        maxEmployees: { colname: "num_employees", operator: "<=" },
      }
    );
    expect(whereClause).toEqual("name ILIKE $1 AND num_employees >= $2");
    expect(values).toEqual(["%net%", 20]);
  });
  test("get bad request error if data is empty", function () {
    try {
      const { setCols, values } = sqlForQuery(
        {},
        {
          nameLike: { colname: "name", operator: "ILIKE" },
          minEmployees: { colname: "num_employees", operator: ">=" },
          maxEmployees: { colname: "num_employees", operator: "<=" },
        }
      );
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});