var alertElement, minimumElement, keyElement, saveElement;
var timeouts = [];

document.addEventListener("DOMContentLoaded", function() {
	// Get DOM elements
	alertElement = document.getElementById("alert");
	minimumElement = document.getElementById("minimum");
	keyElement = document.getElementById("key");
	saveElement = document.getElementById("save");
	
	// Bind function to save button
	saveElement.addEventListener("click", saved);
	
	// Load saved values into page
	chrome.storage.sync.get(["apiKey", "minReviews"], loadStorage);
});

function loadStorage(data) {
	// Load API key into page
	if (data.apiKey && data.apiKey.length > 0) {
		keyElement.value = data.apiKey;
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
		alertElement.innerHTML = "Minimum reviews must positive.";
		alertElement.className = "shown";
		clearTimeouts();
		timeouts.push(setTimeout(function() { alertElement.className = ""; minimumElement.value = 1; }, 5000));
		timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
		return;
	}
	
	// Alert about empty API key input
	if (keyElement.value.length <= 0) {
		alertElement.innerHTML = "Missing API key.";
		alertElement.className = "shown";
		clearTimeouts();
		timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
		timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
		return;
	}
	
	// Verify and save updated minimum value
	queryAPI("https://www.wanikani.com/api/user/" + keyElement.value + "/study-queue", function(data) {
		if (data.error) {
			alertElement.innerHTML = data.error.message;
			alertElement.className = "shown";
			clearTimeouts();
			timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
			timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
		} else {
			chrome.storage.sync.set({ "apiKey": keyElement.value }, function() {
				alertElement.innerHTML = "Settings saved for " + data.user_information.username + ".";
				alertElement.className = "shown";
				clearTimeouts();
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
				
				timeouts.push(setTimeout(function() {
					window.close();
					chrome.extension.getBackgroundPage().location.reload();
					chrome.extension.getBackgroundPage().run();
				}, 2500));
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
				alertElement.innerHTML = "Error accessing WaniKani API.";
				alertElement.className = "shown";
				clearTimeouts();
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
			}
		}
	};
	xmlhttp.open("GET", path, true);
	xmlhttp.send();
}
