#NPM packages express, express-session, shelljs required
npm install express
npm install express-session
npm install shelljs
#iptables config
iptables -N PRX
iptables -I INPUT -p tcp -m multiport --dports 1080,1433 -j PRX
iptables -I INPUT -p tcp -m multiport --dports 1080,1433 -j PRX
iptables -A PRX -j DROP

#login data -> users