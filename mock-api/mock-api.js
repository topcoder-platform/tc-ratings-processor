/**
 * The mock Submission API.
 */
const http = require('http')
const send = require('http-json-response')
const logger = require('../src/common/logger')

const submission1 = {
  id: '14a1b211-283b-4f9a-809f-71e200646560',
  challengeId: 30054163,
  memberId: 27244033,
  legacySubmissionId: 2001,
  resource: 'submission',
  url: 'http://content.topcoder.com/some/path',
  type: 'Contest Submission',
  submissionPhaseId: 95245,
  created: '2018-02-16T00:00:00'
}

const submission2 = {
  id: '14a1b211-283b-4f9a-809f-71e200646561',
  challengeId: 30054163,
  memberId: 27244044,
  resource: 'submission',
  url: 'http://content.topcoder.com/some/path',
  type: 'Contest Submission',
  submissionPhaseId: 95245,
  created: '2018-02-16T00:00:00'
}

const submissions = {
  '/submissions/14a1b211-283b-4f9a-809f-71e200646560': submission1,
  '/submissions/14a1b211-283b-4f9a-809f-71e200646561': submission2
}

const avScanReviewType = {
  id: 'cfdbc0cf-6437-434e-8af1-c56f317f2afd',
  name: 'AV SCAN',
  isActive: true
}

const mockApi = http.createServer((req, res) => {
  logger.debug(`${req.method} ${req.url}`)
  if (req.method === 'GET' &&
    (req.url.match(/^\/submissions\/[1-9]\d*$/) ||
     req.url.match(/^\/submissions\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/gi))) {
    return send(res, 200, submissions[req.url])
  } else if (req.method === 'GET' && req.url.includes('/reviewTypes?')) {
    res.setHeader('x-total-pages', '1')
    return send(res, 200, [avScanReviewType])
  } else {
    // 404 for other routes
    res.statusCode = 404
    res.end('Not Found')
  }
})

if (!module.parent) {
  const port = 3001
  mockApi.listen(port)
  console.log(`mock submission api is listen port ${port}`)
}

module.exports = {
  mockApi
}
