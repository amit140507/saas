from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workout', '0002_muscle_hierarchy'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF to_regclass('workout_bodypart') IS NOT NULL
                   AND EXISTS (
                       SELECT 1
                       FROM information_schema.columns
                       WHERE table_name = 'workout_musclegroup'
                         AND column_name = 'body_part_id'
                   ) THEN
                    UPDATE workout_musclegroup AS muscle_group
                    SET name = body_part.name
                    FROM workout_bodypart AS body_part
                    WHERE muscle_group.body_part_id = body_part.id
                      AND muscle_group.name = 'General';
                END IF;
            END $$;

            ALTER TABLE workout_musclegroup DROP CONSTRAINT IF EXISTS unique_muscle_group_per_body_part;
            ALTER TABLE workout_musclegroup DROP COLUMN IF EXISTS body_part_id CASCADE;
            DROP TABLE IF EXISTS workout_bodypart CASCADE;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'unique_muscle_group_name'
                ) THEN
                    ALTER TABLE workout_musclegroup
                    ADD CONSTRAINT unique_muscle_group_name UNIQUE (name);
                END IF;
            END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
