const { BadRequestError } = require("../expressError");

/* sqlForPartialUpdate, Helper function

 - will be used by a calling function
 - takes in two arguments
 - returns SQL string, and a list of values to partially update object

 - `dataToUpdate`: An object that holds the data fields and their new values to be updated
 - e.g. {firstName: 'Aliya', age: 32}

 - `jsToSql`: An object that will map Javascript-style field names to SQL style field names
 - e.g. {firstName: "first_name"}

  Input example, 
  sqlForPartialUpdate(
  { firstName: 'Aliya', age: 32 },
  { firstName: "first_name" }
);

  Output example,
  {
  setCols: 'first_name=$1, age=$2',
  values: ['Aliya', 32]
}

*/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // list of keys from dataToUpdate function
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  // jsToSql maps the JavaScript key to the database column name where they differ
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

// values will hold a array of values for the query string
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}



module.exports = { sqlForPartialUpdate };
