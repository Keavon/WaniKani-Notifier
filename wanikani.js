var checkInterval = 10;
var reviewIsAvailable = false;
var scheduledAlert;
var lastCheck = new Date().getTime() - 60000;
var apiKey = "";
var minReviews;

run();

function run() {
	hide();
	
	chrome.storage.sync.get(["apiKey", "minReviews"], function(data) {
		if (data.apiKey && data.apiKey.length > 0 && data.minReviews && data.minReviews > 0) {
			apiKey = data.apiKey;
			minReviews = data.minReviews;

			// Initialize
			check();

			// Check every 10 minutes
			setInterval(check, 60000 * checkInterval);

			// Go to reviews when icon is clicked
			chrome.pageAction.onClicked.addListener(function(tab) {
				chrome.tabs.create({
					url: "https://www.wanikani.com/review/session"
				});
			});

			// Show on all tabs
			chrome.tabs.onActivated.addListener(function(tab) {
				show();
			});
			chrome.tabs.onCreated.addListener(function(tab) {
				show();
			});
			chrome.tabs.onUpdated.addListener(function(tab) {
				show();

				chrome.tabs.query({
					"active": true,
					"currentWindow": true
				}, function(tabs) {
					if (typeof tabs[0] !== "undefined" && typeof tabs[0].url !== "undefined") {
						var url = tabs[0].url.toLowerCase();
						if (url === "https://www.wanikani.com/review" || url === "http://www.wanikani.com/review" || url === "https://www.wanikani.com/review/" || url === "http://www.wanikani.com/review/") {
							check();
						}
					}
				});
			});
		} else {
			chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
		}
	});
}

// Show icon
function show() {
	if (reviewIsAvailable) {
		chrome.tabs.getSelected(null, function(tab) {
			chrome.pageAction.show(tab.id);
		});
	}
}

// Hide icon
function hide() {
	chrome.tabs.query({}, function(tabs) {
		for (var tab in tabs) {
			chrome.pageAction.hide(tabs[tab].id);
		}
	});
}

// Query the WaniKani API
function queryAPI(path, callback) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === XMLHttpRequest.DONE && xmlhttp.status === 200) {
			callback(JSON.parse(xmlhttp.responseText));
		}
	};
	xmlhttp.open("GET", path, true);
	xmlhttp.send();
}

// Check the API and update the times and internal data
function check() {
	if (lastCheck < new Date().getTime() - 10000) {
		lastCheck = new Date().getTime();
		queryAPI("https://www.wanikani.com/api/user/" + apiKey + "/study-queue", function(data) {
			if (data.error) {
				alert(data.error.message);
			} else if (data.requested_information.reviews_available >= minReviews) {
				reviewIsAvailable = true;
				show();
			} else if (data.requested_information.reviews_available === 0) {
				reviewIsAvailable = false;
				hide();
				clearTimeout(scheduledAlert);
				scheduledAlert = setTimeout(check, data.requested_information.next_review_date * 1000 - new Date() / 1000 + 60000);
			}
		});
	}
}
