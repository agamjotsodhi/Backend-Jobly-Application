"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate, sqlForQuery } = require("../helpers/sql");

/** Related functions for companies. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * throw bad request error if handle not in company table
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const HandleCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [companyHandle]
    );

    if (HandleCheck.rows.length === 0)
      throw new BadRequestError(`Invalid company handle: ${companyHandle}`);

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, company_handle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
           FROM jobs
           ORDER BY id`
    );
    return jobsRes.rows;
  }

  /** Search all jobs for those meeting criteria in validated query string
   *
   * first check check if hasEquity is true and handle separately from other criteria
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   */

  static async searchAll(fields) {
    let equityClause, finalWhereClause, finalValues;
    if (fields.hasEquity) {
      equityClause = "equity > 0";
    }
    delete fields.hasEquity;

    if (Object.keys(fields).length === 0) {
      finalWhereClause = equityClause;
      finalValues = [];
    } else {
      const { whereClause, values } = sqlForQuery(fields, {
        title: { colname: "title", operator: "ILIKE" },
        minSalary: { colname: "salary", operator: ">=" },
      });

      finalWhereClause = equityClause
        ? whereClause + " AND " + equityClause
        : whereClause;

      finalValues = values;
    }

    const jobsRes = await db.query(
      `SELECT id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
       FROM jobs
       WHERE ${finalWhereClause}
       ORDER BY id`,
      finalValues
    );
    return jobsRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
      `SELECT id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job with id: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title,
                                salary,
                                equity,
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;