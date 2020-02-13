database tcs_catalog;

INSERT INTO project(project_id, project_status_id, project_category_id, create_user, create_date, modify_user, modify_date, tc_direct_project_id)
VALUES(30054163, 1, 37, 132456, current, 132456, current, null);

INSERT INTO project_info
(project_id, project_info_type_id, value, create_user, create_date, modify_user, modify_date)
VALUES(30054163, 56, 2001, '132456', current, '132456', current);

INSERT INTO upload(upload_id, project_id, resource_id, upload_type_id, upload_status_id, parameter, create_user, create_date, modify_user, modify_date)
VALUES(100001, 30054163, 1, 1, 1, 'test', 27244033, '2018-12-1 12:00:00', 27244033, '2018-12-1 12:00:00');
INSERT INTO submission(submission_id, upload_id, submission_status_id, submission_type_id, initial_score, create_user, create_date, modify_user, modify_date)
VALUES(2001, 100001, 1, 1, 90.12, 132457, '2018-12-1 12:00:00', 132457, '2018-12-1 12:00:00');

database informixoltp;

INSERT INTO contest(contest_id, name) VALUES(2001, 'test contest 2001');
INSERT INTO round(round_id, contest_id, name, round_type_id, rated_ind) VALUES(2001, 2001, 'test round 2001', 13, 0);
INSERT INTO round_segment(round_id, segment_id, start_time, end_time, status) VALUES(2001, 1, '2018-12-1 12:00:00', '2018-12-6 12:00:00', 'A');
INSERT INTO round_segment(round_id, segment_id, start_time, end_time, status) VALUES(2001, 5, '2018-12-15 12:00:00', '2018-12-25 12:00:00', 'A');

INSERT INTO problem(problem_id, name) VALUES(2001, 'test problem');
INSERT INTO component(component_id, problem_id, result_type_id, method_name, class_name) VALUES(2001, 2001, 1, 'test method', 'test class');
INSERT INTO division(division_id, division_desc) VALUES(100, 'test division');
INSERT INTO round_component(round_id, component_id, division_id) VALUES(2001, 2001, 100);

INSERT INTO algo_rating(coder_id, rating, vol, algo_rating_type_id) VALUES(27244033, 1200, 100, 3);
INSERT INTO algo_rating(coder_id, rating, vol, algo_rating_type_id) VALUES(27244044, 1300, 110, 3);
INSERT INTO algo_rating(coder_id, rating, vol, algo_rating_type_id) VALUES(27244053, 1400, 120, 3);
INSERT INTO long_component_state(long_component_state_id, round_id, coder_id, component_id, status_id, submission_number, example_submission_number)
VALUES(100001, 2001, 27244044, 2001, 150, 0, 0);
INSERT INTO long_component_state(long_component_state_id, round_id, coder_id, component_id, status_id, submission_number, example_submission_number, points)
VALUES(100002, 2001, 27244053, 2001, 150, 2, 0, 98);
INSERT INTO long_component_state(long_component_state_id, round_id, coder_id, component_id, status_id, submission_number, example_submission_number, points)
VALUES(100003, 2001, 27244064, 2001, 150, 1, 0, 0);
INSERT INTO long_comp_result(coder_id, round_id, attended, placed, rated_ind, advanced)
VALUES(27244044, 2001, 'N', 0, 0, 'N');
INSERT INTO long_comp_result(coder_id, round_id, attended, placed, rated_ind, advanced, system_point_total)
VALUES(27244053, 2001, 'Y', 0, 0, 'N', 99);
INSERT INTO long_comp_result(coder_id, round_id, attended, placed, rated_ind, advanced, system_point_total)
VALUES(27244064, 2001, 'Y', 0, 0, 'N', 0);