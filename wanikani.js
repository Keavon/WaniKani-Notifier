var lastCheck = new Date().getTime() - 60000;
var scheduledAlert;
var apiKey;
var minReviews;
var error = "";
var urlToVisit = "chrome://extensions/?options=" + chrome.runtime.id;

run();

function run() {
	chrome.storage.sync.get(["apiKey", "minReviews", "notNewlyInstalled"], loadSettings);
}

// Initialize extension
function loadSettings(data) {
	// Go to reviews when icon is clicked
	chrome.browserAction.onClicked.addListener(function(tab) {
		if (error) alert("Error:\n" + error);
		else chrome.tabs.create({ url: urlToVisit });
	});
	
	if (data.apiKey && data.apiKey.length > 0 && data.minReviews && data.minReviews > 0) {
		apiKey = data.apiKey;
		minReviews = data.minReviews;
		
		// Perform initial status check
		check();
		
		// Check every 10 minutes
		setInterval(check, 600000);
		
		// Re-check after returning to the reviews completed screen
		chrome.tabs.onUpdated.addListener(function(tab) {
			chrome.tabs.query({ "active": true, "currentWindow": true }, function(tabs) {
				if (typeof tabs[0] !== "undefined" && typeof tabs[0].url !== "undefined") {
					var url = tabs[0].url.toLowerCase();
					if (url === "https://www.wanikani.com/review" || url === "http://www.wanikani.com/review" || url === "https://www.wanikani.com/review/" || url === "http://www.wanikani.com/review/") {
						check();
					}
				}
			});
		});
	} else if (!data.notNewlyInstalled) {
		// Prompt for API key if missing
		chrome.tabs.create({ "url": "chrome://extensions/?options=" + chrome.runtime.id });
	}
}

// Check the API and update the times and internal data
function check() {
	if (lastCheck < new Date().getTime() - 10000) {
		lastCheck = new Date().getTime();
		
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState !== XMLHttpRequest.DONE || xmlhttp.status !== 200) return;
			
			var data  = JSON.parse(xmlhttp.responseText);
			
			error = "";
			if (data.error) {
				// API error
				error = data.error.message;
				chrome.browserAction.setIcon({ path: "icons/grey.png" });
				chrome.browserAction.setTitle({ title: "Error:\n" + error });
			} else if (data.requested_information.reviews_available >= minReviews) {
				// Review is available
				urlToVisit = "https://www.wanikani.com/review/session";
				chrome.browserAction.setIcon({ path: "icons/red.png" });
				chrome.browserAction.setTitle({ title: "Begin WaniKani review" });
			} else if (data.requested_information.lessons_available > 0) {
				// Lesson is available
				urlToVisit = "https://www.wanikani.com/lesson/session";
				chrome.browserAction.setIcon({ path: "icons/orange.png" });
				chrome.browserAction.setTitle({ title: "Begin WaniKani lesson" });
			} else {
				// Waiting
				urlToVisit = "https://www.wanikani.com/dashboard";
				chrome.browserAction.setIcon({ path: "icons/black.png" });
				chrome.browserAction.setTitle({ title: "Open WaniKani dashboard" });
				
				// Schedule next check
				clearTimeout(scheduledAlert);
				scheduledAlert = setTimeout(check, data.requested_information.next_review_date * 1000 - new Date() / 1000 + 60000);
			}
		};
		xmlhttp.open("GET", "https://www.wanikani.com/api/user/" + apiKey + "/study-queue", true);
		xmlhttp.send();
	}
}
