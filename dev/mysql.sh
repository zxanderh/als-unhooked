#!/usr/bin/env bash
# based on
# https://github.com/sequelize/sequelize/blob/5b7c8015c907b0dfd878ca4a9f28343a3392c307/dev/mysql/8.0/start.sh
# https://github.com/sequelize/sequelize/blob/5b7c8015c907b0dfd878ca4a9f28343a3392c307/dev/mysql/8.0/stop.sh
#
# Run script to start mysql server. Run again with "stop" arg to stop it.

# -x removed for general usage. Devs can add it back in for debugging if needed
set -Eeuo pipefail # https://vaneyckt.io/posts/safer_bash_scripts_with_set_euxo_pipefail/
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" # https://stackoverflow.com/a/17744637

docker compose -p sequelize-mysql-80 down --remove-orphans
if [[ "$#" -ne 0 && "$1" == "stop" ]]; then
	echo "Local MySQL-8.0 instance stopped (if it was running)."
	exit 0
fi

docker compose -p sequelize-mysql-80 up -d

# this portion based on https://github.com/sequelize/sequelize/blob/5b7c8015c907b0dfd878ca4a9f28343a3392c307/dev/wait-until-healthy.sh
printf "Waiting for server to be ready"
for n in {1..50}
do
  state=$(docker inspect -f '{{ .State.Health.Status }}' sequelize-mysql-80 2>&1)
  return_code=$?
  if [ ${return_code} -eq 0 ] && [ "$state" == "healthy" ]; then
    echo "sequelize-mysql-80 is healthy!"
    break
  fi
  sleep 0.4
	if [ ${n} -eq 50 ]; then
		>&2 echo "Timeout of 20s exceeded when waiting for container to be healthy: sequelize-mysql-80"
		exit 1
	elif [[ ${-/x} == $- ]]; then
		printf "."
	fi
done
#

docker exec sequelize-mysql-80 \
  mysql --host 127.0.0.1 --port 3306 -uroot -psequelize_test -e "GRANT ALL ON *.* TO 'sequelize_test'@'%' with grant option; FLUSH PRIVILEGES;"

# based on https://github.com/sequelize/sequelize/blob/5b7c8015c907b0dfd878ca4a9f28343a3392c307/dev/mysql/8.0/check.js
node --input-type=module -e "'use strict';import Support from'../test/support.js';const sequelize=Support.createSequelizeInstance();await sequelize.authenticate();await sequelize.close();"

echo "Local MySQL-8.0 instance is ready for Sequelize tests."
