cd C:\Program Files\PostgreSQL\9.4\bin
dropdb -U postgres windwalker_test
createdb -U postgres -Ttemplate_postgis -EUTF8 windwalker_test
psql -U postgres windwalker_test < %~dp0/fixtures/windwalker.test.sql
pause