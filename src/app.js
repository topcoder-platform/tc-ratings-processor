/**
 * The application entry point
 */

require('./bootstrap')
const config = require('config')
const Kafka = require('no-kafka')
const healthcheck = require('topcoder-healthcheck-dropin')
const logger = require('./common/logger')
const helper = require('./common/helper')
const ProcessorService = require('./services/ProcessorService')

// Start kafka consumer
logger.info('Starting kafka consumer')
// create consumer
const consumer = new Kafka.GroupConsumer(helper.getKafkaOptions())

/*
 * Data handler linked with Kafka consumer
 * Whenever a new message is received by Kafka consumer,
 * this function will be invoked
 */
const dataHandler = (messageSet, topic, partition) =>
  Promise.each(messageSet, (m) => {
    const message = m.message.value ? m.message.value.toString('utf8') : null
    logger.info(
      `Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${m.offset}; Message: ${message}.`
    )
    let messageJSON
    try {
      messageJSON = JSON.parse(message)
    } catch (e) {
      logger.error('Invalid message JSON.')
      logger.logFullError(e)
      return
    }

    return ProcessorService.processMessage(messageJSON)
      .then(() => {
        logger.debug('Successfully processed message')
        consumer.commitOffset({ topic, partition, offset: m.offset })
      })
      .catch((err) => {
        logger.logFullError(err)
        consumer.commitOffset({ topic, partition, offset: m.offset })
      })
  })

// check if there is kafka connection alive
const check = () => {
  if (!consumer.client.initialBrokers && !consumer.client.initialBrokers.length) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach((conn) => {
    logger.debug(`url ${conn.server()} - connected=${conn.connected}`)
    connected = conn.connected & connected
  })
  return connected
}

const topics = [
  config.CHALLENGE_NOTIFICATION_EVENTS_TOPIC,
  config.SUBMISSION_NOTIFICATION_AGGREGATE_TOPIC,
  config.NOTIFICATION_AUTOPILOT_EVENTS_TOPIC
]

consumer
  .init([
    {
      subscriptions: topics,
      handler: dataHandler
    }
  ])
  // fetch ignored review types
  .then(() => helper.fetchIgnoredReviewTypes())
  // consume configured topics
  .then(() => {
    logger.info('Initialized.......')
    healthcheck.init([check])
    logger.info('Adding topics successfully.......')
    logger.info(topics)
    logger.info('Kick Start.......')
  })
  .catch((err) => logger.error(err))

if (process.env.NODE_ENV === 'test') {
  module.exports = consumer
}
