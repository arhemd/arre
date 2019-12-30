read -p 'Port to mangage: ' port
iptables -N PRX
iptables -A PRX -j DROP
iptables -A INPUT -p tcp --dport $port -j PRX
iptables -A INPUT -p udp --dport $port -j PRX
apt-get install iptables-persistent -y
iptables-save > /etc/iptables/rules.v4