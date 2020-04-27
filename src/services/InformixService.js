/**
 * This service provides utility function for accessing data in Informix database.
 */

const _ = require('lodash')
const util = require('util')

// The query to get MM challenge round id
const GET_MMCHALLENGE_ROUND_ID_QUERY =
  'select value from tcs_catalog:project_info where project_info_type_id = 56 and project_id = %d'

// The query to get component id
const GET_COMPONENT_ID_QUERY = 'select component_id from informixoltp:round_component where round_id = %d'

// The query to get rated index
const GET_RATED_IND_QUERY = 'select rated_ind from informixoltp:round where round_id = %d'

// The query to get long component state detail
const GET_LONG_COMPONENT_STATE_QUERY = `select informixoltp:long_component_state_id, submission_number
  from long_component_state where round_id = %d and coder_id = %d`

// The query to get submission initial score
const GET_SUBMISSION_INITIAL_SCORE_QUERY = 'select initial_score from tcs_catalog:submission where submission_id = %d'

// The query to get mm challenge result
const GET_MM_RESULT_QUERY =
  'select system_point_total as point, coder_id, attended from informixoltp:long_comp_result where round_id = %d'

// The query to get user mm rating
const GET_USER_MM_RATING_QUERY =
  'select rating, vol from informixoltp:algo_rating where coder_id = %d and algo_rating_type_id = 3'

/**
 * Prepare Informix statement
 * @param {Object} connection the Informix connection
 * @param {String} sql the sql
 * @return {Object} Informix statement
 */
async function prepare(connection, sql) {
  const stmt = await connection.prepareAsync(sql)
  return Promise.promisifyAll(stmt)
}

/**
 * Insert a record in specified table
 * @param {Object} connection the Informix connection
 * @param {String} tableName the table name
 * @param {Object} columnValues the column key-value map
 */
async function insertRecord(connection, tableName, columnValues) {
  try {
    const normalizedColumnValues = _.omitBy(columnValues, _.isNil)
    const keys = Object.keys(normalizedColumnValues)
    const values = _.fill(Array(keys.length), '?')

    const insertRecordStmt = await prepare(
      connection,
      `insert into ${tableName} (${keys.join(', ')}) values (${values.join(', ')})`
    )

    await insertRecordStmt.executeAsync(Object.values(normalizedColumnValues))
  } catch (e) {
    throw e
  }
}

/**
 * Update a record in specified table
 * @param {Object} connection the Informix connection
 * @param {String} tableName the table name
 * @param {Object} columnValues the column key-value map
 * @param {Object} whereConditions the where clause condition map
 */
async function updateRecord(connection, tableName, columnValues, whereConditions) {
  try {
    let keys = Object.keys(columnValues)
    keys = _.map(keys, (k) => `${k} = ?`)
    let conditions = Object.keys(whereConditions)
    conditions = _.map(conditions, (c) => `${c} = ?`)

    const updateRecordStmt = await prepare(
      connection,
      `update ${tableName} set ${keys.join(', ')} where (${conditions.join(' and ')})`
    )

    await updateRecordStmt.executeAsync([...Object.values(columnValues), ...Object.values(whereConditions)])
  } catch (e) {
    throw e
  }
}

/**
 * Get mm challenge round id
 *
 * @param {Object} connection Informix db connection object
 * @param {Number} challengeId challenge id
 *
 * @returns {Number} round id
 */
async function getMMRoundId(connection, challengeId) {
  try {
    const result = await connection.queryAsync(util.format(GET_MMCHALLENGE_ROUND_ID_QUERY, Number(challengeId)))
    if (result.length === 0) {
      return null
    } else {
      return Number(result[0].value)
    }
  } catch (e) {
    throw e
  }
}

/**
 * Get component id
 *
 * @param {Object} connection Informix db connection object
 * @param {Number} roundId round id
 *
 * @returns {Number} component id
 */
async function getComponentId(connection, roundId) {
  try {
    const result = await connection.queryAsync(util.format(GET_COMPONENT_ID_QUERY, Number(roundId)))
    if (result.length === 0) {
      throw new Error('Fail to fetch component id from database.')
    } else {
      return Number(result[0].component_id)
    }
  } catch (e) {
    throw e
  }
}

/**
 * Get rated index
 *
 * @param {Object} connection Informix db connection object
 * @param {Number} roundId round id
 *
 * @returns {Number} rated index
 */
async function getRatedInd(connection, roundId) {
  try {
    const result = await connection.queryAsync(util.format(GET_RATED_IND_QUERY, Number(roundId)))
    if (result.length === 0) {
      throw new Error('Fail to fetch rated index from database.')
    } else {
      return Number(result[0].rated_ind)
    }
  } catch (e) {
    throw e
  }
}

/**
 * Get long component state detail
 *
 * @param {Object} connection Informix db connection object
 * @param {Number} roundId round id
 * @param {Number} memberId member id
 *
 * @returns {Object} long component state detail
 */
async function getLongComponentStateDetail(connection, roundId, memberId) {
  try {
    const result = await connection.queryAsync(
      util.format(GET_LONG_COMPONENT_STATE_QUERY, Number(roundId), Number(memberId))
    )
    if (result.length === 0) {
      throw new Error('Fail to fetch long component state detail from database.')
    } else {
      return {
        longComponentStateId: Number(result[0].long_component_state_id),
        submissionNumber: Number(result[0].submission_number)
      }
    }
  } catch (e) {
    throw e
  }
}

/**
 * Get submission initial score
 *
 * @param {Object} connection Informix db connection object
 * @param {Number} submissionId submission id
 *
 * @returns {Number} submission initials core
 */
async function getSubmissionInitialScore(connection, submissionId) {
  try {
    const result = await connection.queryAsync(util.format(GET_SUBMISSION_INITIAL_SCORE_QUERY, Number(submissionId)))
    if (result.length === 0) {
      throw new Error('Fail to fetch submission initial score from database.')
    } else {
      return Number(result[0].initial_score)
    }
  } catch (e) {
    throw e
  }
}

/**
 * Get mm result
 *
 * @param {Object} connection Informix db connection object
 * @param {Number} roundId round id
 *
 * @returns {Array} mm challenge result
 */
async function getMMResult(connection, roundId) {
  try {
    const queryResult = await connection.queryAsync(util.format(GET_MM_RESULT_QUERY, Number(roundId)))
    const result = []
    for (const element of queryResult) {
      if (element.attended === 'N') {
        result.push({ point: 0, coderId: Number(element.coder_id) })
      } else {
        result.push({ point: Number(element.point), coderId: Number(element.coder_id) })
      }
    }
    return result
  } catch (e) {
    throw e
  }
}

/**
 * Get user MM rating
 *
 * @param {Object} connection Informix db connection object
 * @param {Number} coderId coder id
 *
 * @returns {Object} user MM rating
 */
async function getUserMMRating(connection, coderId) {
  try {
    const queryResult = await connection.queryAsync(util.format(GET_USER_MM_RATING_QUERY, Number(coderId)))
    const result = {
      rating: 0,
      vol: 0
    }
    if (queryResult.length !== 0) {
      result.rating = Number(queryResult[0].rating)
      result.vol = Number(queryResult[0].vol)
    }
    return result
  } catch (e) {
    throw e
  }
}

module.exports = {
  insertRecord,
  updateRecord,
  getMMRoundId,
  getComponentId,
  getRatedInd,
  getLongComponentStateDetail,
  getSubmissionInitialScore,
  getMMResult,
  getUserMMRating
}
