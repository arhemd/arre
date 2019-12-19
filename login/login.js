var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('/etc/letsencrypt/live/shargh.sesajad.me/privkey.pem', 'utf8');
var certificate = fs.readFileSync('/etc/letsencrypt/live/shargh.sesajad.me/cert.pem', 'utf8');
var ca = fs.readFileSync('/etc/letsencrypt/live/shargh.sesajad.me/chain.pem', 'utf8');

var secure = require('express-force-https');

var app = express();

var credentials = {key: privateKey, cert: certificate, ca: ca};
var express = require('express');

function getIP (request) {
	return request.connection.remoteAddress.substring(7);
}

function removeUser (user) {
	shell = require('shelljs');
	var s = shell.exec('iptables-save | grep \"/* ' + user + ' /*\"', {silent: true}).stdout.replace(/-A PRX/g, 'iptables -D PRX');
	
	shell.exec ('sed -i \'/,' + user + ',,/d\' /root/login/users'); 

	console.log (user + ' :REMOVED BY ADMIN');
	
}

function addUser (user, pass) {
	shell = require('shelljs');
	removeUser (user);
	console.log (user + ' :ADDED BY ADMIN');
	shell.exec ('echo \',' + user + ',,' + pass + ',\' >> /root/login/users'); 
}


function addIP (session) {
	shell = require('shelljs');
	if (!shell.exec('iptables-save', {silent: true}).stdout.includes('-A PRX -s ' + session.ip + '/32 -m comment --comment ' + session.username +  ' -j ACCEPT')) {
		
		console.log (session.username + ': ' + session.ip);
		shell.exec ('iptables -I PRX -s ' + session.ip + ' -j ACCEPT -m comment --comment ' + session.username); 
	}
}
function resett () {
	shell = require('shelljs');
	console.log ('RESET BY ADMIN');
	shell.exec ('iptables -F PRX && iptables -A PRX -j DROP'); 
}
function removeIP (session) {
	shell = require('shelljs');
	var s = shell.exec('iptables-save | grep \"/* ' + session.username + ' /*\"', {silent: true}).stdout.replace(/-A PRX/g, 'iptables -D PRX');

	if (s.length > 2){
		console.log ('x: ' + session.username);
		shell.exec (s); 
	}
}
//app.use(secure);
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: false
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.get('/', function(request, response) {
	if (request.session.loggedin) {
		if (request.session.username == 'admin') {
			if (request.session.ip != getIP (request)) {
				request.session.ip = getIP (request);
				addIP (request.session);
			}
			response.sendFile(path.join(__dirname + '/www/manage.html'));
		} else {
			response.sendFile(path.join(__dirname + '/www/status.html'));;
		}
	} else {
		response.sendFile(path.join(__dirname + '/www/login.html'));;
	}
	
});

app.get('/style.css', function(request, response) {
	response.sendFile(path.join(__dirname + '/www/style.css'));
});

app.get('/script.js', function(request, response) {
	response.sendFile(path.join(__dirname + '/www/script.js'));
});

app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	require('fs').readFile('/root/login/users', function (err, data) {
	  if (err) throw err;
	  if(data.includes(',' + username + ',,' + password + ',')){
	   request.session.loggedin = true;
	   request.session.username = username;
	   request.session.ip = getIP(request);
	   request.session.secret = username + ':' + getIP (request);
	   if (username != 'admin')removeIP(request.session);
	   addIP(request.session);
	  }
	  response.redirect('/');
	});
});

app.post('/signout', function(request, response) {
	removeIP(request.session);
	request.session.loggedin = false;
	request.session.secret = 'secret';
	response.redirect('/');
	
});
app.post('/reset', function(request, response) {
	if (request.session.username == 'admin') {
		resett();
		addIP (request.session);
	}
	response.redirect('/');
	
});
app.post('/register', function(request, response) {
	if (request.session.username == 'admin') {
		if (request.body.password == 'R3m0ve') {
			removeUser(request.body.username);
		} else {	
			addUser (request.body.username, request.body.password);
		}
	}
	response.redirect('/');
	
});
let redirApp = express();
redirApp.use(secure);

var httpServer = http.createServer(redirApp);
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(443);
httpServer.listen(80);
