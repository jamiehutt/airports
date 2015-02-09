var cm_map;
var cm_openInfowindow;
var cm_mapMarkers = [];
var cm_mapHTMLS = [];

// Change these parameters to customize map
var param_wsId = "od6";
var param_ssKey = "0AhC0pIbhEzdWdEpwYjRONVdJN0lHNWVOTlVPSkR3Y1E";
var param_useSidebar = true;
var param_titleColumn = "airportname";
var param_icaoColumn = "airporticaoidentifier";
var param_descriptionColumn = "visitdescription";
var param_photoColumn = "flickrphototag";
var param_videoColumn = "youtubeurl";
var param_cityColumn = "nearestcommunity";
var param_stateColumn = "stateorprovince";
var param_latColumn = "lat";
var param_lngColumn = "long";
var param_dateColumn = "visitdate";
var param_rankColumn = "";
var param_iconType = "green";
var param_iconOverType = "orange";

/**
 * Loads map and calls function to load in worksheet data.
 */
function cm_load() {  
  var myLatlng = new google.maps.LatLng(43.907787,-79.359741);
  var myOptions = {
    zoom: 2,
    center: myLatlng,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  }
  cm_map = new google.maps.Map(document.getElementById("cm_map"), myOptions);

  cm_getJSON();
}

/**
 * Function called when marker on the map is clicked.
 * Opens an info window (bubble) above the marker.
 * @param {Number} markerNum Number of marker in global array
 */
function cm_markerClicked(markerNum) {
  var infowindowOptions = {
    content: cm_mapHTMLS[markerNum]
  }
  var infowindow = new google.maps.InfoWindow(infowindowOptions);
  infowindow.open(cm_map, cm_mapMarkers[markerNum]);
  cm_setInfowindow(infowindow);
}

/**
 * Function that sorts 2 worksheet rows from JSON feed
 * based on their rank column. Only called if column is defined.
 * @param {rowA} Object Represents row in JSON feed
 * @param {rowB} Object Represents row in JSON feed
 * @return {Number} Difference between row values
 */
function cm_sortRows(rowA, rowB) {
  var rowAValue = parseFloat(rowA["gsx$" + param_rankColumn].$t);
  var rowBValue = parseFloat(rowB["gsx$" + param_rankColumn].$t);

  return rowAValue - rowBValue;
}

/** 
 * Called when JSON is loaded. Creates sidebar if param_sideBar is true.
 * Sorts rows if param_rankColumn is valid column. Iterates through worksheet rows, 
 * creating marker and sidebar entries for each row.
 * @param {JSON} json Worksheet feed
 */	 
function cm_loadMapJSON(json) {
  var usingRank = false;

  if(param_useSidebar == true) {
    var sidebarDIV = document.createElement("div");
    sidebarDIV.style.overflow = "auto";
    sidebarDIV.style.height = "100%";
    sidebarDIV.style.fontSize = "16px";
    sidebarDIV.style.color = "#000000";
    document.getElementById("cm_mapSidebar").appendChild(sidebarDIV);
  }

  var bounds = new google.maps.LatLngBounds();

  if(json.feed.entry[0]["gsx$" + param_rankColumn]) {
    usingRank = true;
    json.feed.entry.sort(cm_sortRows);
  }

  for (var i = 0; i < json.feed.entry.length; i++) {
    var entry = json.feed.entry[i];
    if(entry["gsx$" + param_latColumn]) {
	var lat = parseFloat(entry["gsx$" + param_latColumn].$t);
	var lng = parseFloat(entry["gsx$" + param_lngColumn].$t);
	var point = new google.maps.LatLng(lat,lng);
	var html = "<div class=\"balloonContent\">";
	html += "<div class=\"header cf\"><div class=\"title cf\"><div class=\"airportName\">" + entry["gsx$"+param_titleColumn].$t + "</div><div class=\"icaoID\">" +
			entry["gsx$"+param_icaoColumn].$t 
			+ "</div></div><div class=\"placeTime cf\"><div class=\"place\">" + entry["gsx$"+param_cityColumn].$t + ", " + entry["gsx$"+param_stateColumn].$t + "</div><div class=\"date\">" + entry["gsx$"+param_dateColumn].$t + "</div></div></div><div class=\"contentBody\">";
	var label = entry["gsx$"+param_titleColumn].$t;
	var rank = 0;
	if(usingRank && entry["gsx$" + param_rankColumn]) {
		rank = parseInt(entry["gsx$"+param_rankColumn].$t);
	}
	if(entry["gsx$" + param_descriptionColumn]) {
		html += "<div class=\"visitDescription\">" + entry["gsx$"+param_descriptionColumn].$t + "</div>";
	}
	
	if(entry["gsx$"+param_videoColumn].$t) {
		var videoURL = entry["gsx$"+param_videoColumn].$t;
		html += "<iframe style=\"margin-bottom:12px;\" width=\"434\" height=\"244\" src=\"" + videoURL + "\" frameborder=\"0\" allowfullscreen></iframe>";
	}
	
	if(entry["gsx$"+param_photoColumn].$t) {
		var photoTag = entry["gsx$"+param_photoColumn].$t;
		$(function() {
			var apiKey = '99a28282592c0ece47fd3aa1d52a66d8';
			var userId = '99363918@N00';
			var perPage = '25';
			var showOnPage = '25';
			
			$.getJSON('http://api.flickr.com/services/rest/?format=json&method='+
				'flickr.photos.search&api_key=' + apiKey + '&user_id=' + userId + 
				'&tags=' + photoTag + '&per_page=' + perPage + '&jsoncallback=?', 
			function(data){
				var classShown = 'class="lightbox"';
				var classHidden = 'class="lightbox hidden"';
				
				$.each(data.photos.photo, function(i, rPhoto){
				  var basePhotoURL = 'http://farm' + rPhoto.farm + '.static.flickr.com/'
					+ rPhoto.server + '/' + rPhoto.id + '_' + rPhoto.secret;            
					
					var thumbPhotoURL = basePhotoURL + '_s.jpg';
					var mediumPhotoURL = basePhotoURL + '.jpg';
					
					var photoStringStart = '<a ';
					var photoStringEnd = 'title="' + rPhoto.title + '" href="'+ 
						mediumPhotoURL +'"><img src="' + thumbPhotoURL + '" alt="' + 
						rPhoto.title + '"/></a>;'                
					var photoString = (i < showOnPage) ? 
						photoStringStart + classShown + photoStringEnd : 
						photoStringStart + classHidden + photoStringEnd;
												
					$(photoString).appendTo("#flickr");
				});
				$("a.lightbox").lightBox();
				
			});
		});
	}
	html += "<div id=\"flickr\"></div>";
	html += "</div></div>";

	// create the marker
	var marker = cm_createMarker(cm_map,point,label,html,rank);
	// cm_map.addOverlay(marker);
	cm_mapMarkers.push(marker);
	 
	cm_mapHTMLS.push(html);
	bounds.extend(point);
    
	if(param_useSidebar == true) {
		var markerA = document.createElement("a");
		markerA.setAttribute("href","javascript:cm_markerClicked('" + i +"')");
		markerA.style.color = "#000000";
		var sidebarText= "";
		if(usingRank) {
		  sidebarText += rank + ") ";
		} 
		sidebarText += label;
		markerA.appendChild(document.createTextNode(sidebarText));
		sidebarDIV.appendChild(markerA);
	} 
    }
  }
  
  var markerCluster = new MarkerClusterer(cm_map, cm_mapMarkers);
  cm_map.fitBounds(bounds);
  cm_map.setCenter(bounds.getCenter());
}

function cm_setInfowindow(newInfowindow) {
  if (cm_openInfowindow != undefined) {
    cm_openInfowindow.close();
  }

  cm_openInfowindow = newInfowindow;
}

/**
 * Creates marker with ranked Icon or blank icon,
 * depending if rank is defined. Assigns onclick function.
 * @param {GLatLng} point Point to create marker at
 * @param {String} title Tooltip title to display for marker
 * @param {String} html HTML to display in InfoWindow
 * @param {Number} rank Number rank of marker, used in creating icon
 * @return {GMarker} Marker created
 */
function cm_createMarker(map, latlng, title, html, rank) {
  var iconSize = new google.maps.Size(29, 43);
  var iconShadowSize = new google.maps.Size(43, 43);
  var iconHotSpotOffset = new google.maps.Point(9, 43); // Should this be (9, 34)?
  var iconPosition = new google.maps.Point(0, 0);
  var infoWindowAnchor = new google.maps.Point(9, 2);
  var infoShadowAnchor = new google.maps.Point(18, 25);

  var iconShadowUrl = "img/airport_shadow.png";
  var iconImageUrl = "img/airportMarkerOn.png";
  var iconImageOverUrl = "img/airportMarkerOn.png";
  var iconImageOutUrl = "img/airportMarkerOn.png";

  if(rank > 0 && rank < 100) {
    iconImageOutUrl = "http://gmaps-samples.googlecode.com/svn/trunk/" +
		"markers/" + param_iconType + "/marker" + rank + ".png";
    iconImageOverUrl = "http://gmaps-samples.googlecode.com/svn/trunk/" +
		"markers/" + param_iconOverType + "/marker" + rank + ".png";
    iconImageUrl = iconImageOutUrl;
  } else { 
    iconImageOutUrl = "img/airportMarkerOn.png";
    iconImageOverUrl = "img/airportMarkerOff.png";
    iconImageUrl = iconImageOutUrl;
  }

  var markerShadow =
	new google.maps.MarkerImage(iconShadowUrl, iconShadowSize,
						  iconPosition, iconHotSpotOffset);

  var markerImage =
	new google.maps.MarkerImage(iconImageUrl, iconSize,
						  iconPosition, iconHotSpotOffset);

  var markerImageOver =
	new google.maps.MarkerImage(iconImageOverUrl, iconSize,
						  iconPosition, iconHotSpotOffset);

  var markerImageOut =
	new google.maps.MarkerImage(iconImageOutUrl, iconSize,
						  iconPosition, iconHotSpotOffset);

  var markerOptions = {
    title: title,
    icon: markerImage,
    shadow: markerShadow,
    position: latlng,
    map: map
  }

  var marker = new google.maps.Marker(markerOptions);

  google.maps.event.addListener(marker, "click", function() {
    var infowindowOptions = {
	content: html
    }
    var infowindow = new google.maps.InfoWindow(infowindowOptions);
    cm_setInfowindow(infowindow);
    infowindow.open(map, marker);
    marker.setIcon(markerImageOut);
  });
  google.maps.event.addListener(marker, "mouseover", function() {
    marker.setIcon(markerImageOver);
  });
  google.maps.event.addListener(marker, "mouseout", function() {
    marker.setIcon(markerImageOut);
  });

  return marker;
}

/**
 * Creates a script tag in the page that loads in the 
 * JSON feed for the specified key/ID. 
 * Once loaded, it calls cm_loadMapJSON.
 */
function cm_getJSON() {

  // Retrieve the JSON feed.
  var script = document.createElement('script');

  script.setAttribute('src', 'http://spreadsheets.google.com/feeds/list'
				 + '/' + param_ssKey + '/' + param_wsId + '/public/values' +
				'?alt=json-in-script&callback=cm_loadMapJSON');
  script.setAttribute('id', 'jsonScript');
  script.setAttribute('type', 'text/javascript');
  document.documentElement.firstChild.appendChild(script);
}

setTimeout('cm_load()', 500);