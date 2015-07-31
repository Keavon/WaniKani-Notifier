$(function() {
	chrome.storage.sync.get("apiKey", function(data) {
		if (data.apiKey.length > 0) {
			$("#key")[0].value = data.apiKey;
		}
	});

	$("#go").click(function() {
		var key = $("#key")[0].value;
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
						chrome.extension.getBackgroundPage().run();
					});
				}
			});
		}
	});
});

function queryAPI(path, callback) {
	$.ajax({
		"url": path,
		"cache": false,
		"dataType": "json"
	}).done(callback).fail(function() {
		callback("Error accessing API (Is your API key valid?)");
	});
}
