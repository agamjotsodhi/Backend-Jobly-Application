"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

/** Find all companies with optional filters applied.
 *
 * searchFilters can contain:
 * - minEmployees: minimum number of employees
 * - maxEmployees: maximum number of employees
 * - name: case-insensitive, partial match search on the company name
 *
 * Returns: [{ handle, name, description, numEmployees, logoUrl }, ...]
 */

static async findAll(searchCriteria = {}) {
  const { minEmployees, maxEmployees, name } = searchCriteria;

  // Validate the employee range to ensure it makes logical sense
  if (minEmployees !== undefined && maxEmployees !== undefined && minEmployees > maxEmployees) {
    throw new BadRequestError("Minimum employees cannot exceed maximum employees");
  }

  // Base SQL query structure
  let baseQuery = `
    SELECT handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"
    FROM companies`;
  
  const filters = [];
  const parameters = [];

  // Build query conditions based on search criteria
  if (minEmployees !== undefined) {
    parameters.push(minEmployees);
    filters.push(`num_employees >= $${parameters.length}`);
  }

  if (maxEmployees !== undefined) {
    parameters.push(maxEmployees);
    filters.push(`num_employees <= $${parameters.length}`);
  }

  if (name) {
    parameters.push(`%${name}%`);
    filters.push(`name ILIKE $${parameters.length}`);
  }

  // Append conditions to the base query if any filters are present
  if (filters.length > 0) {
    baseQuery += ` WHERE ${filters.join(' AND ')}`;
  }

  // Finalize the query by sorting the results
  baseQuery += ` ORDER BY name`;

  // Execute the query with the gathered parameters
  const result = await db.query(baseQuery, parameters);
  return result.rows;
}

/** Get request handling:
 *  returns detailed info per specific company by handle  
 *  Returns: { handle, name, description, numEmployees, logoUrl, jobs }
 *  where jobs is an array of job details [{ id, title, salary, equity }, ...]
 *  Return NotFoundError when company is not found in database
 */

static async get(handle) {
  // Query to fetch company details
  const companyData = await db.query(
    `SELECT handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"
     FROM companies
     WHERE handle = $1`, [handle]);

  const company = companyData.rows[0];

  if (!company) {
    throw new NotFoundError(`Company with handle '${handle}' not found`);
  }

  // Query to fetch related jobs for the company
  const jobData = await db.query(
    `SELECT id, title, salary, equity
     FROM jobs
     WHERE company_handle = $1
     ORDER BY id`, [handle]);

  company.jobs = jobData.rows;

  return company;
}

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
