var alertElement, minimumElement, keyElement, saveElement;
var timeouts = [];
var notNewlyInstalled;

document.addEventListener("DOMContentLoaded", function() {
	// Get DOM elements
	alertElement = document.getElementById("alert");
	minimumElement = document.getElementById("minimum");
	keyElement = document.getElementById("key");
	saveElement = document.getElementById("save");
	
	// Bind function to save button
	saveElement.addEventListener("click", saved);
	
	// Load saved values into page
	chrome.storage.sync.get(["apiKeyV2", "minReviews", "notNewlyInstalled"], loadStorage);
});

function loadStorage(data) {
	// Save newly installed state
	notNewlyInstalled = data.notNewlyInstalled;
	chrome.storage.sync.set({ "notNewlyInstalled": true });
	
	// Load API key into page
	if (data.apiKeyV2 && data.apiKeyV2.length > 0) {
		keyElement.value = data.apiKeyV2;
	}
	
	// Load minimum reviews into page
	if (data.minReviews && data.minReviews > 0) {
		minimumElement.value = data.minReviews;
	} else {
		minimumElement.value = 1;
	}
}

function saved(event) {
	// Verify and save updated minimum value
	if (minimumElement.value.length > 0 && parseInt(minimumElement.value) > 0) {
		chrome.storage.sync.set({ "minReviews": parseInt(minimumElement.value) });
	} else {
		alertElement.innerHTML = "Minimum reviews must positive";
		alertElement.className = "shown";
		clearTimeouts();
		timeouts.push(setTimeout(function() { alertElement.className = ""; minimumElement.value = 1; }, 5000));
		timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
		return;
	}
	
	// Alert about empty API key input
	if (keyElement.value.length <= 0) {
		alertElement.innerHTML = "Missing API key";
		alertElement.className = "shown";
		clearTimeouts();
		timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
		timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
		return;
	}
	
	// Verify and save updated minimum value
	queryAPI("https://api.wanikani.com/v2/user", function(data) {
		console.log(data);
		if (data.error) {
			// Remove period from message string for consistency
			var msgNoPeriod = data.error.message;
			if (msgNoPeriod.substr(-1) === ".") {
				msgNoPeriod = msgNoPeriod.slice(0, -1);
			}
			
			alertElement.innerHTML = msgNoPeriod;
			alertElement.className = "shown";
			clearTimeouts();
			timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
			timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
		} else {
			chrome.storage.sync.set({ "apiKeyV2": keyElement.value }, function() {
				alertElement.innerHTML = "Settings saved for " + data.data.username;
				alertElement.className = "shown";
				clearTimeouts();
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
				
				chrome.extension.getBackgroundPage().run();
				
				if (!notNewlyInstalled) timeouts.push(setTimeout(window.close, 2500));
			});
		}
	});
}

function clearTimeouts() {
	timeouts.forEach(function(to) {
		clearTimeout(to);
	});
	timeouts = [];
}

function queryAPI(path, callback) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === XMLHttpRequest.DONE) {
			if (xmlhttp.status === 200) {
				callback(JSON.parse(xmlhttp.responseText));
			} else {
				alertElement.innerHTML = "Error accessing WaniKani API";
				alertElement.className = "shown";
				clearTimeouts();
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
			}
		}
	};
	xmlhttp.open("GET", path, true);
	xmlhttp.setRequestHeader('Authorization', 'Bearer ' + keyElement.value);
	xmlhttp.send();
}
