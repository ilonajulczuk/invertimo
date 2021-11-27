scp ./server_setup.sh root@${HOSTNAME?}:~/
ssh root@${HOSTNAME?} "./server_setup.sh"

scp ${HOSTNAME?}_docker_compose.service root@${HOSTNAME?}:/etc/systemd/system/${HOSTNAME?}_docker_compose.service
scp ${HOSTNAME?}.nginx.conf root@${HOSTNAME?}:/etc/nginx/sites-enabled/${HOSTNAME?}.nginx.conf
ssh root@${HOSTNAME?} "systemctl daemon-reload"
ssh root@${HOSTNAME?} "systemctl enable ${HOSTNAME?}_docker_compose.service"
ssh root@${HOSTNAME?} "systemctl enable ${HOSTNAME?}_docker_compose.service"