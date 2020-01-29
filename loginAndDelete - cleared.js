var fs = require('fs');
var https = require('https');
https.globalAgent.options.ca = fs.readFileSync('C:\\Users\\GABDURA\\Desktop\\Certificates\\mobilecenter.detss.corpintra.net\\mobilecenter.detss.corpintra.net-chain.pem');

//variables used in script, do not change
var endRes = "";
var parsed = [];
var parsedAndroid = [];
var parsedIOS = [];
var iOSPackages = [];
var androidPackages = [];
var postStringArr = [];
var appID = "";
var appIdentifier = "";

//varaibles for user/connector/host/port data, subject to change
var credentials = '{"name": "admin@default.com","password": "-"}';                   //CHANGEIT
var host = "-";                                                                      //CHANGEIT
var port = 8443;
var maxAllowedApps = 3;


var loginOptions = {
	host: host,
	port: port,
	path: "/rest/client/login",
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	}
};

var deleteOptions = {
	host: host,
	port: port,
	path: "/rest/apps/deleteVersion",
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		"Cookie": "",
		"x-hp4msecret": ""
	}
};

var getOptions = {
	host: host,
	port: port,
	path: "/rest/apps",
	headers: {
		"Cookie": ""
	}
};

function login(data) {
	var post = https.request(loginOptions, res => {
		res.setEncoding('utf8');
		res.on('data', () => {});
		res.on('end', () => {
			getOptions.headers["Cookie"] = res.headers["set-cookie"];
			deleteOptions.headers["Cookie"] = res.headers["set-cookie"];
			deleteOptions.headers["x-hp4msecret"] = res.headers["x-hp4msecret"];
			console.log(data);
			console.log("Post login sent!");
			console.log(res.statusMessage);
			getApps();
		})}).on('error', (e) => {
			console.error("login error: " + e.message);
	});
	post.write(data);
	post.end();
};

function deleteApp(data) {
	return new Promise((resolve, reject) => {
		var post = https.request(deleteOptions, res => {
			res.setEncoding('utf8');
			res.on('data', () => {});
			res.on('end', () => {
				console.log(data);
				console.log("Post delete App sent!");
				console.log(deleteOptions.headers);
				console.log(res.statusMessage);
				resolve();
			})}).on('error', (e) => {
				console.error("login error: " + e.message);
				reject();
		});
		post.write(data);
		post.end();
	});
};

//next main function after login, gets the login token in cookies from login function
function getApps() {
	https.get(getOptions, (res) => {
		res.on('data', chunk => {
			try {
				endRes = endRes.concat(chunk);
			} catch (err) {
				console.log("error from get: " + err);
			}
		});
		res.on('end', () => {
			if (res.statusCode == 401) {
				console.log("The Authentication is not going through. Please check the POST methods on MC Server and the password of admin user.");
				process.exit(1);
			};
			handleJson(endRes);
		});
	}).on('error', (e) => {
		console.log('error from https.get: ' + e);
		console.log(cookies);
	});
};

//next main function that handles the received JSON data, loops through every app in the json data
function handleJson(rawData) {
	parsed = JSON.parse(rawData).data;
	sortIOSAndroid(parsed);
	parsedIOS.forEach(app => {
		addDistinct("IOS", app.identifier ? app.identifier : "missing");
	});
	iOSPackages.forEach(packageName => {
		var maxCounter = 0;
		parsedIOS.forEach(app => {
			if (app.identifier == packageName) {
				app.counter > maxCounter ? maxCounter = app.counter : null;
			};
		});
		parsedIOS.forEach(app => {
			if (app.identifier == packageName && app.counter < maxCounter - maxAllowedApps) {
				appID = app.id;
				appIdentifier = app.identifier;
				var postString = `{"id": "${appID}", "identifier": "${appIdentifier}"}`;
				console.log(postString + "FROM LOOP");
				postStringArr.push(postString);
			};
		});
	});
	parsedAndroid.forEach(app => {
		addDistinct("Android", app.identifier ? app.identifier : "missing");
	});
	androidPackages.forEach(packageName => {
		var maxCounter = 0;
		parsedAndroid.forEach(app => {
			if (app.identifier == packageName) {
				app.counter > maxCounter ? maxCounter = app.counter : null;
			};
		});
		parsedAndroid.forEach(app => {
			if (app.identifier == packageName && app.counter < maxCounter - maxAllowedApps) {
				appID = app.id;
				appIdentifier = app.identifier;
				var postString = `{"id": "${appID}", "identifier": "${appIdentifier}"}`;
				console.log(postString + "FROM LOOP");
				postStringArr.push(postString);
			};
		});
	});
	sendDeletePosts();
};

async function sendDeletePosts() {
	asyncForEach(postStringArr, async (el) => {
		await deleteApp(el);
	});
};

async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	};
};
function addDistinct(type, packageName) {
	if (packageName !== "missing") {
		if (type === "IOS") {
			iOSPackages.indexOf(packageName) === -1 ? iOSPackages.push(packageName) : null;
		} else if (type === "Android") {
			androidPackages.indexOf(packageName) === -1 ? androidPackages.push(packageName) : null;
		};
	};
};

function sortIOSAndroid(json) {
	json.forEach(el => {
		if (el.type == "IOS") {
			parsedIOS.push(el);
		} else if (el.type == "ANDROID") {
			parsedAndroid.push(el);
		} else {
			console.log(`Incorrect type of the app! ${el.identifier ? el.identifier : el}`);
		};
	});
};

//start point of the whole script
login(credentials);