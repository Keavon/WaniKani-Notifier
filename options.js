document.addEventListener('DOMContentLoaded', function() {
	chrome.storage.sync.get(["apiKey", "minReviews"], function(data) {
		if (data.apiKey && data.apiKey.length > 0) {
			document.getElementById("key").value = data.apiKey;
		}
		if (data.minReviews && data.minReviews > 0) {
			document.getElementById("minimum").value = data.minReviews;
		} else {
			document.getElementById("minimum").value = 1;
		}
	});

	document.getElementById("save").addEventListener("click", function(event) {
		var minimum = document.getElementById("minimum").value;
		if (minimum.length > 0 && parseInt(minimum) > 0) {
			chrome.storage.sync.set({
				"minReviews": parseInt(minimum)
			});
		} else {
			alert("Minimum reviews value must be a positive integer.");
			return;
		}

		var key = document.getElementById("key").value;
		if (key.length > 0) {
			queryAPI("https://www.wanikani.com/api/user/" + key + "/study-queue", function(data) {
				if (data.error) {
					alert(data.error.message);
				} else {
					chrome.storage.sync.set({
						"apiKey": key
					}, function() {
						alert("Signed into " + data.user_information.username + " successfully.");
						window.close();
						chrome.extension.getBackgroundPage().location.reload();
						chrome.extension.getBackgroundPage().run();
					});
				}
			});
		}
	});
});

function queryAPI(path, callback) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === XMLHttpRequest.DONE) {
			if (xmlhttp.status === 200) {
				callback(JSON.parse(xmlhttp.responseText));
			} else {
				alert("Error accessing API (Is your API key valid?)");
			}
		}
	};
	xmlhttp.open("GET", path, true);
	xmlhttp.send();
}
