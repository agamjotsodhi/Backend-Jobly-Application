const { sqlForPartialUpdate, sqlForQuery } = require("./sql");
const { BadRequestError } = require("../expressError");

// test for sql.js

describe("create sql string for partial update", function () {
  test("create string", function () {
    const { setCols, values } = sqlForPartialUpdate(
      {
        firstName: "Joe",
        age: 27,
      },
      {
        firstName: "first_name",
        lastName: "last_name",
        isAdmin: "is_admin",
      }
    );
    expect(setCols).toEqual('"first_name"=$1, "age"=$2');
    expect(values).toEqual(["Joe", 27]);
  });
  test("works if jsToSql is empty", function () {
    const { setCols, values } = sqlForPartialUpdate(
      {
        firstName: "Joe",
        age: 27,
      },
      {}
    );
    expect(setCols).toEqual('"firstName"=$1, "age"=$2');
    expect(values).toEqual(["Joe", 27]);
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
