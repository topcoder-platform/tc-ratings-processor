/**
 * Processor Service
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const config = require('config')
const momentTZ = require('moment-timezone')
const submissionApi = require('@topcoder-platform/topcoder-submission-api-wrapper')
const logger = require('../common/logger')
const helper = require('../common/helper')
const IDGenerator = require('../common/IdGenerator')
const constants = require('../constants')
const InformixService = require('./InformixService')

const idGen = new IDGenerator(config.ID_SEQ_COMPONENT_STATE)

const submissionApiClient = submissionApi(
  _.pick(config, [
    'AUTH0_URL',
    'AUTH0_AUDIENCE',
    'TOKEN_CACHE_TIME',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'SUBMISSION_API_URL',
    'AUTH0_PROXY_SERVER_URL'
  ])
)

const timeZone = 'America/New_York'

/**
 * This function is responsible of processing the registration event.
 *
 * @param {Object} payload The registration event payload.
 */
async function processRegistration(payload) {
  logger.info('Process Marathon Match registration event.')

  // informix database connection
  const connection = await helper.getInformixConnection()

  try {
    await connection.beginTransactionAsync()

    const roundId = await InformixService.getMMRoundId(connection, payload.data.challengeId)

    if (roundId) {
      logger.debug('Getting longComponentStateId')

      const longComponentStateId = await idGen.getNextId()

      logger.debug(`longComponentStateId = ${longComponentStateId}`)

      const componentId = await InformixService.getComponentId(connection, roundId)

      await InformixService.insertRecord(connection, 'informixoltp:long_component_state', {
        long_component_state_id: longComponentStateId,
        round_id: roundId,
        coder_id: payload.data.userId,
        component_id: componentId,
        status_id: constants.componentStatus.PassedSystemTest,
        submission_number: 0,
        example_submission_number: 0
      })

      const ratedInd = await InformixService.getRatedInd(connection, roundId)

      await InformixService.insertRecord(connection, 'informixoltp:long_comp_result', {
        coder_id: payload.data.userId,
        round_id: roundId,
        attended: 'N',
        placed: 0,
        rated_ind: ratedInd,
        advanced: 'N'
      })

      await connection.commitTransactionAsync()

      logger.info('Completed processing Marathon Match registration event.')
    } else {
      logger.info(`Marathon Match doesn't exist with given id: ${payload.data.challengeId}, ignore this event`)
    }
  } catch (e) {
    logger.error('Error in processing Marathon Match registration event.')
    logger.error(e)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
}

processRegistration.schema = {
  payload: Joi.object()
    .keys({
      data: Joi.object().keys({
        challengeId: Joi.id().required(),
        userId: Joi.id().required()
      })
    })
    .unknown(true)
    .required()
}

/**
 * This function is responsible of processing the review event.
 *
 * @param {Object} payload The review event payload.
 */
async function processReview(payload) {
  logger.info('Process Marathon Match review event.')

  const ignoredIds = helper.getIgnoredReviewTypeIds()
  if (_.includes(ignoredIds, payload.typeId)) {
    logger.info('Review is ignored.')
    return
  }

  let submissionRes
  try {
    submissionRes = await submissionApiClient.getSubmission(payload.submissionId)
  } catch (err) {
    throw new Error(_.get(err, 'body.message'))
  }

  if (!submissionRes.body.created) {
    throw new Error(`No submission time for submission ${payload.submissionId}`)
  }
  const submitTime = new Date(momentTZ.tz(submissionRes.body.created, timeZone).format()).getTime() / 1000
  const challengeId = submissionRes.body.challengeId
  const memberId = submissionRes.body.memberId
  if (!memberId) {
    throw new Error(`No memberId for submission ${payload.submissionId}`)
  }
  if (!challengeId) {
    throw new Error(`No challengeId for submission ${payload.submissionId}`)
  }

  // informix database connection
  const connection = await helper.getInformixConnection()

  try {
    const roundId = await InformixService.getMMRoundId(connection, challengeId)
    console.debug(`roundId = ${roundId}`)

    if (roundId) {
      const { longComponentStateId, submissionNumber } = await InformixService.getLongComponentStateDetail(
        connection,
        roundId,
        memberId
      )

      await InformixService.insertRecord(connection, 'informixoltp:long_submission', {
        long_component_state_id: longComponentStateId,
        submission_number: submissionNumber + 1,
        example: 0,
        open_time: submitTime,
        submit_time: submitTime,
        submission_points: payload.score,
        language_id: 9
      })

      await InformixService.updateRecord(
        connection,
        'informixoltp:long_component_state',
        {
          points: payload.score,
          submission_number: submissionNumber + 1
        },
        {
          long_component_state_id: longComponentStateId
        }
      )

      await connection.commitTransactionAsync()

      logger.info('Completed processing Marathon Match review event.')
    } else {
      logger.info(`Marathon Match doesn't exist with challenge id: ${challengeId}, ignore this event`)
    }
  } catch (e) {
    logger.error('Error in processing Marathon Match review event.')
    logger.error(e)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
}

processReview.schema = {
  payload: Joi.object()
    .keys({
      submissionId: Joi.sid().required(),
      typeId: Joi.sid().required(),
      score: Joi.number().required()
    })
    .unknown(true)
    .required()
}

/**
 * This function is responsible of processing the review summation event.
 *
 * @param {Object} payload The review summation event payload.
 */
async function processReviewSummation(payload) {
  logger.info('Process Marathon Match review summation event.')

  let submissionRes
  try {
    submissionRes = await submissionApiClient.getSubmission(payload.submissionId)
  } catch (err) {
    throw new Error(_.get(err, 'body.message'))
  }

  const challengeId = submissionRes.body.challengeId
  const memberId = submissionRes.body.memberId
  const legacySubmissionId = submissionRes.body.legacySubmissionId
  if (!legacySubmissionId) {
    throw new Error(`No legacySubmissionId for submission ${payload.submissionId}`)
  }
  if (!memberId) {
    throw new Error(`No memberId for submission ${payload.submissionId}`)
  }
  if (!challengeId) {
    throw new Error(`No challengeId for submission ${payload.submissionId}`)
  }

  // informix database connection
  const connection = await helper.getInformixConnection()

  try {
    const roundId = await InformixService.getMMRoundId(connection, challengeId)
    if (roundId) {
      const initialScore = await InformixService.getSubmissionInitialScore(connection, legacySubmissionId)

      await InformixService.updateRecord(
        connection,
        'informixoltp:long_comp_result',
        {
          system_point_total: payload.aggregateScore,
          point_total: initialScore,
          attended: 'Y'
        },
        {
          round_id: roundId,
          coder_id: memberId
        }
      )

      await connection.commitTransactionAsync()

      logger.info('Completed processing Marathon Match review summation event.')
    } else {
      logger.info(`Marathon Match doesn't exist with challenge id: ${challengeId}, ignore this event`)
    }
  } catch (e) {
    logger.error('Error in processing Marathon Match review summation event.')
    logger.error(e)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
}

processReviewSummation.schema = {
  payload: Joi.object()
    .keys({
      submissionId: Joi.sid().required(),
      aggregateScore: Joi.number().required()
    })
    .unknown(true)
    .required()
}

/**
 * This function is responsible of processing the review end event.
 *
 * @param {Object} payload The review end event payload.
 */
async function processReviewEnd(payload) {
  if (payload.phaseTypeName === 'Review' && payload.state === 'End') {
    // informix database connection
    const connection = await helper.getInformixConnection()

    try {
      const roundId = await InformixService.getMMRoundId(connection, payload.projectId)

      if (roundId) {
        const result = await InformixService.getMMResult(connection, roundId)
        result.sort((first, second) => second.point - first.point)

        for (let i = 0; i < result.length; i++) {
          if (i === 0 || result[i].point !== result[i - 1].point) {
            result[i].placed = i + 1
          } else {
            result[i].placed = result[i - 1].placed
          }

          const { rating, vol } = await InformixService.getUserMMRating(connection, result[i].coderId)

          await InformixService.updateRecord(
            connection,
            'informixoltp:long_comp_result',
            {
              placed: result[i].placed,
              old_rating: rating,
              old_vol: vol
            },
            {
              round_id: roundId,
              coder_id: result[i].coderId
            }
          )
        }

        await connection.commitTransactionAsync()

        logger.info('Completed processing Marathon Match review end event.')
      } else {
        logger.info(`Marathon Match doesn't exist with challenge id: ${payload.projectId}, ignore this event`)
      }
    } catch (e) {
      logger.error('Error in processing Marathon Match review end event.')
      logger.error(e)
      await connection.rollbackTransactionAsync()
      throw e
    } finally {
      await connection.closeAsync()
    }
  } else {
    logger.info('Ignore this event, only process review end event')
  }
}

processReviewEnd.schema = {
  payload: Joi.object()
    .keys({
      projectId: Joi.id().required(),
      phaseTypeName: Joi.string().required(),
      state: Joi.string().required()
    })
    .unknown(true)
    .required()
}

/**
 * Process the Kafka message
 * @param {Object} message the kafka message
 */
async function processMessage(message) {
  logger.info(`Processing message - ${message}`)
  if (message.topic === config.CHALLENGE_NOTIFICATION_EVENTS_TOPIC) {
    if (message.payload.type === 'USER_REGISTRATION') {
      await this.processRegistration(message.payload)
    } else {
      // TODO: USER_UNREGISTRATION - delete use from `long_comp_result` and `long_component_state`
      logger.info('Ignore this event, not user registration')
    }
  } else if (message.topic === config.SUBMISSION_NOTIFICATION_AGGREGATE_TOPIC) {
    if (message.payload.originalTopic !== config.SUBMISSION_NOTIFICAION_CREATE_TOPIC) {
      logger.info("Ignore this event, originalTopic doesn't match")
    } else if (message.payload.resource === constants.resources.review) {
      await this.processReview(message.payload)
    } else if (message.payload.resource === constants.resources.reviewSummation) {
      await this.processReviewSummation(message.payload)
    } else {
      logger.info("Ignore this event, resource doesn't match")
    }
  } else {
    await this.processReviewEnd(message.payload)
  }
}

processMessage.schema = {
  message: Joi.object()
    .keys({
      topic: Joi.string().required(),
      originator: Joi.string().required(),
      timestamp: Joi.date().required(),
      'mime-type': Joi.string().required(),
      payload: Joi.object().required()
    })
    .required()
}

module.exports = {
  processMessage,
  processRegistration,
  processReview,
  processReviewSummation,
  processReviewEnd
}

logger.buildService(module.exports)
