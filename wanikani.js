var lastCheck = new Date().getTime() - 60000;
var scheduledAlert;
var apiKeyV2;
var minReviews;
var error = "";
var urlToVisit = "chrome://extensions/?options=" + chrome.runtime.id;

run();

function run() {
	chrome.storage.sync.get(["apiKeyV2", "minReviews", "notNewlyInstalled"], loadSettings);
}

// Initialize extension
function loadSettings(data) {
	// Go to reviews when icon is clicked
	chrome.browserAction.onClicked.addListener(function(tab) {
		if (error) alert("Error:\n" + error);
		else chrome.tabs.create({ url: urlToVisit });
	});
	
	if (data.apiKeyV2 && data.apiKeyV2.length > 0 && data.minReviews && data.minReviews > 0) {
		apiKeyV2 = data.apiKeyV2;
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
		const requestOptions = {
			headers: {
			  'Authorization': 'Bearer '+apiKeyV2,
			},
		  };
		var errors = [];
		var index = [["Lessons","https://api.wanikani.com/v2/assignments?immediately_available_for_lessons=true"], 
					["Reviews", "https://api.wanikani.com/v2/assignments?immediately_available_for_review=true"],
					["Summary", "https://api.wanikani.com/v2/summary"]],
			promises = index.map(i => fetch(i[1], requestOptions).then(response => {
				if (response.ok) {
				  return response.json()
				} else {
				  return Promise.reject(i[0] + ": " + response.status + " " + response.statusText)
				}
			  }).catch(function(error) {
				errors.push(error);
			}));
		
		var dict = [];
		
		Promise.all(promises)
		.then(ps => Promise.all(ps.map(p => p))) // p.json() also returns a promise
		.then(js => js.forEach((j,i) => (dict[i] = j)))
		.then(x => {
			if (errors.length > 0) {
				// API error
				error = errors.join('\n');
				urlToVisit = "https://www.wanikani.com/dashboard";
				chrome.browserAction.setIcon({ path: "icons/grey.png" });
				chrome.browserAction.setTitle({ title: "Error:\n" + error });
			} else if (dict[1].total_count >= minReviews) {
				// Review is available
				urlToVisit = "https://www.wanikani.com/review/session";
				chrome.browserAction.setIcon({ path: "icons/red.png" });
				chrome.browserAction.setTitle({ title: "Begin WaniKani review" });
			} else if (dict[0].total_count > 0) {
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
				var nextReviewDate = Date.parse(dict[2].data.next_reviews_at) - new Date().getTime();			
				scheduledAlert = setTimeout(check, nextReviewDate); //use nextReviewDate
			}
		});
	}
}
