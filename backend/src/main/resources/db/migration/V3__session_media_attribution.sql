ALTER TABLE workout_session_exercises
    ADD COLUMN primary_video_source_url VARCHAR(1000),
    ADD COLUMN primary_video_license_name VARCHAR(200),
    ADD COLUMN primary_video_license_url VARCHAR(1000),
    ADD COLUMN primary_video_author VARCHAR(500);
