cd /root
read -p 'Port to mangage: ' port
iptables -N PRX
iptables -A PRX -j DROP
iptables -A INPUT -p tcp --dport $port -j PRX
iptables -A INPUT -p udp --dport $port -j PRX
apt-get install iptables-persistent -y
iptables-save > /etc/iptables/rules.v4
apt-get install curl -y
curl -sL https://deb.nodesource.com/setup_13.x | sudo bash -
apt-get install nodejs -y
apt-get install npm -y
npm install express
npm install express-session
npm install express-force-https
npm install shelljs
npm install forever -g
