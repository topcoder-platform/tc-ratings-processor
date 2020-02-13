# Topcoder - Legacy rating Processor

## Verification

start Kafka server, start informix database(Make sure you have already executed `docker-ifx/update.sql` script to insert test data), start mock api server and start the processor

1. start kafka-console-producer to write messages to `challenge.notification.events` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.events`

2. write message:
  `{ "topic": "challenge.notification.events","originator": "challenge-api","timestamp": "2020-02-09T00:00:00.000Z","mime-type": "application/json","payload": { "type": "USER_REGISTRATION", "data": { "challengeId": 30054163, "userId": 27244033 } } }`

3. Check the app console, it will show the success message.

4. check the database using following sql script:

    ```bash
    database informixoltp;
    select * from long_component_state;
    select * from long_comp_result;
    ```

5. write message:
  `{ "topic": "challenge.notification.events","originator": "challenge-api","timestamp": "2020-02-09T00:00:00.000Z","mime-type": "application/json","payload": { "type": "USER_REGISTRATION", "data": { "challengeId": 30054164, "userId": 27244033 } } }`

6. check the app console, it will show message indicated event is ignored.

7. start kafka-console-producer to write messages to `submission.notification.aggregate` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic submission.notification.aggregate`

8. write message:
  `{ "topic": "submission.notification.aggregate","originator": "submission-api","timestamp": "2020-02-09T00:00:00.000Z","mime-type": "application/json","payload": { "resource": "review", "submissionId": "14a1b211-283b-4f9a-809f-71e200646560", "typeId": "55bbb17d-aac2-45a6-89c3-a8d102863d05", "score": 90.12, "originalTopic": "submission.notification.create" } }`

9. check the app console, it will show success message.

10. check the database using following sql script:

    ```bash
    database informixoltp;
    select * from long_submission;
    select * from long_component_state;
    ```

11. write message:
  `{ "topic": "submission.notification.aggregate","originator": "submission-api","timestamp": "2020-02-09T00:00:00.000Z","mime-type": "application/json","payload": { "resource": "review", "submissionId": "14a1b211-283b-4f9a-809f-71e200646561", "typeId": "cfdbc0cf-6437-434e-8af1-c56f317f2afd", "score": 80.12, "originalTopic": "submission.notification.create" } }`

12. check the app console, it will show message indicated event is ignored.

13. write message:
  `{ "topic": "submission.notification.aggregate","originator": "submission-api","timestamp": "2020-02-09T00:00:00.000Z","mime-type": "application/json","payload": { "resource": "reviewSummation", "submissionId": "14a1b211-283b-4f9a-809f-71e200646560", "aggregateScore": 98, "originalTopic": "submission.notification.create" } }`

14. check the app console, it will show success message.

15. check the database using following sql script:

    ```bash
    database informixoltp;
    select * from long_comp_result;
    ```

16. write message:
  `{ "topic": "submission.notification.aggregate","originator": "submission-api","timestamp": "2020-02-09T00:00:00.000Z","mime-type": "application/json","payload": { "resource": "reviewSummation", "submissionId": "14a1b211-283b-4f9a-809f-71e200646561", "aggregateScore": 98, "originalTopic": "submission.notification.create" } }`

17. check the app console, it will show error message indicated error occurs during processing this event.

18. start kafka-console-producer to write messages to `notifications.autopilot.events` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic notifications.autopilot.events`

19. write message:
  `{ "topic": "notifications.autopilot.events","originator": "challenge-api","timestamp": "2020-02-09T00:00:00.000Z","mime-type": "application/json","payload": { "projectId": 30054163, "phaseTypeName": "Review", "state": "End" } }`

20. check the app console, it will show success message.

21. check the database using following sql script:

    ```bash
    database informixoltp;
    select * from long_comp_result;
    ```

22. write message:
  `{ "topic": "notifications.autopilot.events","originator": "challenge-api","timestamp": "2020-02-09T00:00:00.000Z","mime-type": "application/json","payload": { "projectId": 30054163, "phaseTypeName": "Review", "state": "Start" } }`

23. check the app console, it will show message indicate event is ignored.
