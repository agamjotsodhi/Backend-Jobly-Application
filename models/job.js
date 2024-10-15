"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate, sqlForQuery } = require("../helpers/sql");

/** The Job class manages the job-related functionality for the application. */

class Job {
  /** Add a new job to the database.
   *
   * This method takes job details like title, salary, equity, and companyHandle,
   * verifies if the provided companyHandle exists in the database, 
   * and inserts the new job.
   *
   * Returns the newly created job data: { id, title, salary, equity, companyHandle }.
   *
   * Throws BadRequestError if the given companyHandle does not exist.
   */

  static async create({ title, salary, equity, companyHandle }) {
    const handleCheck = await db.query(
      `SELECT handle
       FROM companies
       WHERE handle = $1`,
      [companyHandle]
    );

    if (handleCheck.rows.length === 0) {
      throw new BadRequestError(`Company handle ${companyHandle} not found.`);
    }

    const result = await db.query(
      `INSERT INTO jobs
       (title, salary, equity, company_handle)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );

    return result.rows[0];
  }

  /** Retrieve all jobs from the database.
   *
   * Returns an array of job objects, each with: 
   * { id, title, salary, equity, companyHandle }.
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

  /** Search for jobs by certain criteria passed in via query parameters.
   *
   * The method checks for fields such as minSalary, title (partial match), 
   * and whether the job has equity (equity > 0).
   *
   * Returns a filtered list of jobs matching the criteria: 
   * [{ id, title, salary, equity, companyHandle }, ...]
   */

  static async searchAll(fields) {
    let equityClause, finalWhereClause, finalValues;

    if (fields.hasEquity) {
      equityClause = "equity > 0";
    }
    delete fields.hasEquity;

    if (Object.keys(fields).length === 0) {
      finalWhereClause = equityClause || "";
      finalValues = [];
    } else {
      const { whereClause, values } = sqlForQuery(fields, {
        title: { colname: "title", operator: "ILIKE" },
        minSalary: { colname: "salary", operator: ">=" }
      });

      finalWhereClause = equityClause
        ? `${whereClause} AND ${equityClause}`
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

  /** Given a job ID, retrieve its details.
   *
   * Returns the job data: 
   * { id, title, salary, equity, companyHandle }.
   *
   * Throws NotFoundError if the job is not found.
   */

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

    if (!job) throw new NotFoundError(`No job found with ID: ${id}`);

    return job;
  }

  /** Update job data with the provided fields.
   *
   * This method supports partial updates; it will only modify the fields 
   * provided in the data object.
   *
   * Returns the updated job data: { id, title, salary, equity, companyHandle }.
   *
   * Throws NotFoundError if the job does not exist.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;

    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job found with ID: ${id}`);

    return job;
  }

  /** Remove a job from the database by its ID.
   *
   * Throws NotFoundError if the job does not exist.
   */

  static async remove(id) {
    const result = await db.query(
      `DELETE
       FROM jobs
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job found with ID: ${id}`);
  }
}

module.exports = Job;
