"use strict";

const db = require("../db");
const { NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

class Job {
  /** 
   * Add a new job to the database and return its details.
   * Input: { title, salary, equity, companyHandle }
   * Output: { id, title, salary, equity, companyHandle }
   */
  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
      `INSERT INTO jobs (title, salary, equity, company_handle)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    return result.rows[0];  // Return the newly created job.
  }

  /**
   * Retrieve a list of all jobs, with optional filters.
   * Filters: minSalary (>=), hasEquity (true for equity > 0), title (partial match).
   * Returns: List of matching jobs with company info.
   */
  static async findAll(filters = {}) {
    const { minSalary, hasEquity, title } = filters;
    let query = `
      SELECT j.id, j.title, j.salary, j.equity, 
             j.company_handle AS "companyHandle", 
             c.name AS "companyName"
      FROM jobs j
      LEFT JOIN companies AS c ON c.handle = j.company_handle`;

    const conditions = [];
    const values = [];

    // Apply filters only if provided.
    if (minSalary !== undefined) {
      values.push(minSalary);
      conditions.push(`salary >= $${values.length}`);
    }

    if (hasEquity) conditions.push(`equity > 0`);

    if (title) {
      values.push(`%${title}%`);
      conditions.push(`title ILIKE $${values.length}`);
    }

    // Append conditions to query if any filters are applied.
    if (conditions.length) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY title";  // Order results by job title.
    const result = await db.query(query, values);

    return result.rows;  // Return the list of jobs.
  }

  /**
   * Retrieve a specific job by its ID, including company details.
   * Throws an error if the job isn't found.
   * Returns: { id, title, salary, equity, company }
   */
  static async get(id) {
    const jobRes = await db.query(
      `SELECT id, title, salary, equity, 
              company_handle AS "companyHandle"
       FROM jobs WHERE id = $1`, 
      [id]
    );

    const job = jobRes.rows[0];
    if (!job) throw new NotFoundError(`No job: ${id}`);

    const companyRes = await db.query(
      `SELECT handle, name, description, 
              num_employees AS "numEmployees", 
              logo_url AS "logoUrl"
       FROM companies WHERE handle = $1`, 
      [job.companyHandle]
    );

    job.company = companyRes.rows[0];  // Attach company details to the job.
    delete job.companyHandle;  // Clean up unnecessary property.

    return job;
  }

  /**
   * Update job data with provided fields.
   * Partial updates are supported (only provided fields are changed).
   * Throws an error if the job isn't found.
   * Returns: Updated job details.
   */
  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const query = `
      UPDATE jobs 
      SET ${setCols} 
      WHERE id = $${values.length + 1} 
      RETURNING id, title, salary, equity, 
                company_handle AS "companyHandle"`;

    const result = await db.query(query, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;  // Return the updated job details.
  }

  /**
   * Remove a job from the database by its ID.
   * Throws an error if the job isn't found.
   * Returns: Nothing.
   */
  static async remove(id) {
    const result = await db.query(
      `DELETE FROM jobs WHERE id = $1 
       RETURNING id`, 
      [id]
    );

    if (!result.rows.length) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;
