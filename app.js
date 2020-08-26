const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const secure = require('express-force-https');
const shell = require('shelljs');
const schedule = require('node-schedule');

var storageRoot = path.dirname(process.execPath);
if (storageRoot.endsWith('bin')) storageRoot = __dirname;

var usersPath = path.join(storageRoot, 'users');
var expPath = path.join(storageRoot, 'users_exp');
if (!fs.existsSync(usersPath)) usersPath = path.join(storageRoot, 'users-sample');

var secretsRoot = path.join(storageRoot, 'secrets');
if (!fs.existsSync(path.join(secretsRoot, 'privkey.pem'))) secretsRoot = path.join(storageRoot, 'secrets-sample');


const privateKey  = fs.readFileSync(path.join(secretsRoot, 'privkey.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(secretsRoot, 'cert.pem'), 'utf8');
var ca;
var credentials = {key: privateKey, cert: certificate};
if (fs.existsSync(path.join(secretsRoot, 'chain.pem')))  {
	ca = fs.readFileSync(path.join(secretsRoot, 'chain.pem'), 'utf8');
	credentials = {key: privateKey, cert: certificate, ca: ca};
}


const app = express();

function expCheck(){
	var expArr = fs.readFileSync(expPath).toString().split('\n');
	var today = getDay();
	for (var i=0; i < expArr.length; i++){
		var temp = expArr[i].split(',')
		if (temp == null || temp.length < 3) continue;
		if (parseInt(temp[1]) + parseInt(temp[2]) < today){
			removeUserIP(temp[0]);
		}
	}
}

function userExpCheck(username){
	var expArr = fs.readFileSync(expPath).toString().split('\n');
	var today = getDay();
	for (var i=0; i < expArr.length; i++){
		var temp = expArr[i].split(',')
		if (temp == null || temp.length < 3) continue;
		if (temp[0] != username) continue;
		if (parseInt(temp[1]) + parseInt(temp[2]) < today){
			return true;
		} else {
			return false;
		}
	}
	return false;
}

function getDay(){
	return Math.floor((Date.now()/1000/3600+3.5)/24);
}


function getIP (request) {
	return request.connection.remoteAddress.substring(7);
}

function getUserList(){
	var usArr = fs.readFileSync(usersPath).toString().split('\n');
	var tempArr = []
	for (var i = 0; i < usArr.length; i++) {
		if (usArr[i].startsWith(',,,')) continue;
		if (usArr[i].startsWith(',')){
			var usr = usArr[i].substring(1, usArr[i].indexOf(',,'))
			if (!isSuperUser(usr))tempArr.push(usr);
		}
	}
	return tempArr;
}


function userExists (username) {
	var flag = false;
	if (username.length == 0) return false;
	if (require('fs').readFileSync(usersPath).includes(`,${username},,`)) flag = true;
	
	return flag;
}	

function authCheck (username, password) {
	var flag = false;
	if (username.length == 0 || password.length == 0) return false;
	if (fs.readFileSync(usersPath).includes(`,${username},,${password},`)) flag = true;
	return flag;
}
			       
function isSuperUser (username) {
	var flag = false;
	if (username.length == 0) return false;
	if (fs.readFileSync(usersPath).includes(`,,,${username},,,`)) flag = true;
	return flag;
}

function renewExp(username, days) {
	var expArr = fs.readFileSync(expPath).toString().split('\n');
	var today = getDay();
	var start = 0;
	var prevDays = 0;
	for (var i = 0; i < expArr.length; i++){
		if (expArr[i].length <2) continue;
		var temp = expArr[i].split(',')
		if (temp[0] == username) {
			start = parseInt (temp[1]);
			prevDays = parseInt(temp[2]);
		}
	}
	if (today + days < start + prevDays + days) {
		today = start;
		days += prevDays;
	}
	
	var s = username + ',' + today + ',' + days;
	
	shell.exec (`sed -i \'/${username},/d\' ${expPath}`);
	shell.exec (`echo \'${s}\' >> ${expPath}`);
}

function removeUser (user, suser) {
	if (user.length == 0 || !userExists (user)) return;
	
	
	var s = shell.exec('iptables-save | grep \"/* ' + user + ' /*\"', {silent: true}).stdout.replace(/-A PRX/g, 'iptables -D PRX');
	
	shell.exec (`sed -i \'/,${user},,/d\' ${usersPath}`);  

	console.log (user + ` :REMOVED BY ${suser}`);
}

function addUser (user, pass, suser) {
	if (user.length == 0 || pass.length == 0) return;
	
	removeUser (user, suser);
	console.log (user + ` :ADDED BY ${suser}`);
	shell.exec (`echo \',${user},,${pass},\' >> ${usersPath}`); 
}

function addIP (session) {
	
	if (!session.superUser && userExpCheck(session.username)) return;
	
	if (shell.exec('iptables-save', {silent: true}).stdout.includes('-A PRX -s ' + session.ip + `/32 -m comment --comment ${session.username} -j ACCEPT`)) return;
	
	if (!session.superUser){
		var s = shell.exec(`iptables-save | grep \"/* ${session.username} /*\"`, {silent: true}).stdout.replace(/-A PRX/g, 'iptables -D PRX');
		if (s.length > 2){
			
			var sArr = s.split('\n');
			var temp = "";
			if (sArr.length > 2){
				for (var i = 0; i < sArr.length - 2; i++){
					temp += sArr[sArr.length - 1 - i] + '\n';
				}
			}
			shell.exec (temp);
		}
	}
	
	console.log (session.username + ': ' + session.ip);
	shell.exec ('iptables -I PRX -s ' + session.ip + ' -j ACCEPT -m comment --comment ' + session.username); 
}

function resett (suser) {
	
	console.log (`RESET BY ${suser}`);
	shell.exec ('iptables -F PRX && iptables -A PRX -j DROP'); 
}

function removeIP (session) {
	
	var s = shell.exec(`iptables-save | grep \"/* ${session.username} /*\"`, {silent: true}).stdout.replace(/-A PRX/g, 'iptables -D PRX');
	if (s.length > 2){
		console.log ('x: ' + session.username);
		shell.exec (s); 
	}
}

function removeUserIP (username) {
	
	var s = shell.exec(`iptables-save | grep \"/* ${username} /*\"`, {silent: true}).stdout.replace(/-A PRX/g, 'iptables -D PRX');
	if (s.length > 2){
		console.log ('x: ' + username);
		shell.exec (s); 
	}
}

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: false,
	cookie : {
        maxAge: 1000* 60 * 60 *24 * 365
    }
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.get('/', function(request, response) {
	if (request.session.loggedin) {
		if (request.session.superUser) {
			if (request.session.ip != getIP (request)) {
				request.session.ip = getIP (request);
				addIP (request.session);
			}
			response.sendFile(path.join(storageRoot + '/views/users/manage.html'));
		} else {
			if (request.session.ip != getIP (request)) {
				request.session.ip = getIP (request);
				addIP (request.session);
			}
			response.sendFile(path.join(storageRoot + '/views/users/status.html'));;
		}
	} else {
		response.sendFile(path.join(storageRoot + '/views/users/login.html'));;
	}
	
});

app.get('/style.css', function(request, response) {
	response.sendFile(path.join(storageRoot + '/views/users/style.css'));
});

app.get('/script.js', function(request, response) {
	response.sendFile(path.join(storageRoot + '/views/users/script.js'));
});
app.get('/user_list', function(request, response) {
	if (request.session.superUser) {
		response.send(getUserList().toString());
	}
});


app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username.length == 0 || password.length == 0) return;
	
	  if(authCheck(username, password)){
	   request.session.loggedin = true;
	   request.session.username = username;
	   request.session.ip = getIP(request);
	   request.session.superUser = false;
	   if (isSuperUser(username)) request.session.superUser = true;
	   request.session.secret = username + ':' + getIP (request);
	   //if (!request.session.superUser)removeIP(request.session);
	   addIP(request.session);
	  }
	  response.redirect('/');
	
});

app.post('/signout', function(request, response) {
	removeIP(request.session);
	request.session.loggedin = false;
	request.session.secret = 'secret';
	response.redirect('/');
	
});
app.post('/reset', function(request, response) {
	if (request.session.superUser) {
		resett(request.session.username);
		addIP (request.session);
	}
	response.redirect('/');
	
});
app.post('/register', function(request, response) {
	if (isSuperUser(request.body.username)) return;
	if (request.session.superUser) {
		addUser (request.body.username, request.body.password, request.session.username);
	}
	response.redirect('/');
	
});

app.post('/remove', function(request, response) {
	if (isSuperUser(request.body.username)) return;
	if (request.session.superUser) {
		removeUser(request.body.username, request.session.username);
	}
	response.redirect('/');
});

let redirApp = express();
//redirApp.use(secure);

var httpServer = http.createServer(app);
//var httpsServer = https.createServer(credentials, app);
//httpsServer.listen(443);
httpServer.listen(8080);

schedule.scheduleJob('* * 8 * * *', ()=>{
	expCheck();
});

schedule.scheduleJob('* * * 1 * *', ()=>{
	console.log ('AUTOMATIC RESET');
	shell.exec ('iptables -F PRX && iptables -A PRX -j DROP'); 
});