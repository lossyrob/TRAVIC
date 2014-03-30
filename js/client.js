// Copyright 2014, University of Freiburg,
// Chair of Algorithms and Data Structures.
// Author: Patrick Brosi <brosip@informatik.uni-freiburg.de>

// translation
var DAY_MAP = new Array("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday");
var DAY_SPANS = {"mtillfr" : "monday till friday",
                 "sundays" : "sundays",
                 "saturdays" : "saturdays",
                 "weekends" : "weekends",
                 "daily" : "daily"
                };
var MISC = {"irrservice" : "irregular additional services",
            "addserviceon" : "Additional service on",
           }

function getParamByName(name) {
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location);
  if (results == null) return "";
  else return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function showVehicleStations(w) {
  for (var i = 0; i < w.sts.length; i++) {
    (function() {
      var curStation = w.sts[i];
      var arrTimeStr = transitLayer._getTimeString(curStation.at);
      var depTimeStr = transitLayer._getTimeString(curStation.dt);
      var s = "<li";
      if (i == w.sts.length -1) s += " class='last'";
      s += "><span class='time'>";
      if (curStation.at != curStation.dt || curStation.ad != curStation.dd) s += "<span class='arrTime'>"+arrTimeStr+"</span>" + (curStation.ad != 0 ? " <span class='arrDelay'>+"+transitLayer._getDelayString(curStation.ad)+"</span>":"") + "<br/>";
      s += "<span class='depTime'>"+depTimeStr+"</span>" + (curStation.dd != 0 ? " <span class='depDelay'>+"+transitLayer._getDelayString(curStation.dd)+"</span>":"") + "</span>";
      s += "</li>";
      var ss = $("<span class='stationname'>"+curStation.n+"</span>");
      s = $(s);
      s.append(ss);
      ss.click(function() {
        (function() {
          map.panTo(new L.latLng(curStation.p[0], curStation.p[1]));
        })();
      });
      $("#bar #lineVerlauf ul").append(s);
      s.hide();
      window.setTimeout(function() {s.fadeTo(500, 1)}, i*15)
    })();
  }
  $("#bar #lineVerlauf #lineVerlaufScroll").jScrollPane({"animateScroll":true}).data('jsp').scrollToPercentX(0);
  $(window).resize(function() {
    $("#bar #lineVerlauf #lineVerlaufScroll").data('jsp').reinitialise();
  })
}

function clearVehicleWay() {
  $("#bar #lineNumber").hide();
  $("#bar #lineTo").html("");
  $("#bar #lineDesc").html("");
  $("#bar #lineTravelTimes").html("");
  $("#bar #lineVerlauf ul").html("");
  $("#bar #barLoading").show();
}

function getOpDate(day) {
  return day.y + 1900 + "/" + day.m + "/" + day.d;
}

function getOpString(pos, neg, operating) {
  var ret = "";
  switch(operating) {
    case 31:
      ret = DAY_SPANS["mtillfr"];
      break;
    case 64:
      ret = DAY_SPANS["sundays"];
      break;
    case 32:
      ret = DAY_SPANS["saturdays"];
      break;
    case 96:
      ret = DAY_SPANS["weekends"];
      break;
    case 127:
      ret = DAY_SPANS["daily"];
      break;
    default:
      var map = Number(operating).toString(2);
      var first = false;
      for (var i=0; i < 7; i++) {
        if (map.charAt(i) == "1") {
          if (first) ret += ", ";
          first = true;
          ret += DAY_MAP[i];
        }
      }
  }

  if (pos.length > 0) {
    var posDays = "";
    for (var i=0; i < pos.length; i++) {
      posDays += getOpDate(pos[i]);
      if (i < pos.length-1) posDays += ", ";
    }
    if (pos.length > 10) {
      if (operating == 0) ret += "irregularly";
      else ret += " (" + MISC["irrservice"] + ")";
    }else{
      if (operating == 0) ret += posDays;
      else ret += ". " + MISC["addserviceon"] + " " + posDays + ".";
    }
  }

  if (neg.length > 0) {
    var negDays = "";
    for (var i=0; i < neg.length; i++) {
      negDays += getOpDate(neg[i]);
      if (i < neg.length-1) negDays += ", ";
    }
    ret += " (no service on " + negDays + ")";
  }

  return ret;
}

window.showVehicleWay = function(w) {
  clearVehicleWay();
  $("#bar #lineVerlauf ul").html("");
  $("#bar #barLoading").hide();
  $("#bar #lineNumber").show();
  $("#bar #lineNumber").html(w.sn);
  if (w.c) $("#bar #lineNumber").css("background-color", "#"+w.c);
  else $("#bar #lineNumber").css("background-color", transitLayer.getStandardBgColor(w.t));
  if (w.tc) $("#bar #lineNumber").css("color", "#"+w.tc);
  else $("#bar #lineNumber").css("color", transitLayer.getStandardTextColor(w.t));
  $("#bar #lineTo").html(w.hs);
  $("#bar #lineDesc").html(w.ln);
  var opStr = "<span class='vehType'>" + transitLayer.getVehicleTypeName(w.t) + "</span>";

  opStr += "Operating: ";
  opStr += getOpString(w.tt.p, w.tt.n, w.tt.t);

  $("#bar #lineTravelTimes").html(opStr);
  $("#bar #lineVerlauf ul").html("");
  $("#bar #lineVerlauf ul").css("width", w.sts.length*70 + 50 + "px");
  showVehicleStations(w);
};

$("#slowerbut").click(function() {
  if (transitLayer.getMultiplicator() <= 1) transitLayer.setMultiplicator((transitLayer.getMultiplicator() - 0.1));
  else if (transitLayer.getMultiplicator() <= 10) transitLayer.setMultiplicator(transitLayer.getMultiplicator() - 1);
  else if (transitLayer.getMultiplicator() <= 20) transitLayer.setMultiplicator(transitLayer.getMultiplicator()- 5);
  else transitLayer.setMultiplicator(transitLayer.getMultiplicator() - 10);
  if (transitLayer.getMultiplicator() < 1) $("#speedoview").html(transitLayer.getMultiplicator().toFixed(1) + "x");
  else $("#speedoview").html(transitLayer.getMultiplicator().toFixed(0) + "x");
});

$("#normalbut").click(function() {
  transitLayer.setMultiplicator(1);
  $("#speedoview").html(transitLayer.getMultiplicator() + "x");
});

$("#fasterbut").click(function() {
  if (transitLayer.getMultiplicator() < 1) transitLayer.setMultiplicator((transitLayer.getMultiplicator().valueOf() - 0 + 0.1));
  else if (transitLayer.getMultiplicator() < 10) transitLayer.setMultiplicator(transitLayer.getMultiplicator() + 1);
  else if (transitLayer.getMultiplicator() < 20) transitLayer.setMultiplicator(transitLayer.getMultiplicator()+ 5);
  else transitLayer.setMultiplicator(transitLayer.getMultiplicator() + 10);
  if (transitLayer.getMultiplicator() < 1) $("#speedoview").html(transitLayer.getMultiplicator().toFixed(1) + "x");
  else $("#speedoview").html(transitLayer.getMultiplicator().toFixed(0) + "x");
});

$("#currenttime").click(function() {
  transitLayer.setCurrentTime();
  transitLayer.setMultiplicator(1);
  $("#speedoview").html("1x");
});

$("#barclosebut").click(function() {
  $("#bar").animate({"height":0}, 200, "swing", function() {clearVehicleWay();});
  transitLayer.clearVehicleTraj();
  transitLayer.unselectVehicle();
});

var gmapLayer = new L.Google('HYBRID');
var osmLayer = new L.TileLayer('http://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '',
          maxZoom: 20
      });
var oenvKarteLayer = new L.TileLayer('http://a.tile2.opencyclemap.org/transport/{z}/{x}/{y}.png', {
    attribution: '',
    maxZoom: 20
});

var starttime = (new Date()).getTime();
var pos = new L.LatLng(46.980252,8.26129);
var zoom = 9;
var statMode = false;

if (getParamByName("statmode")) {
  var statMode = getParamByName("statmode");
}
if (getParamByName("lat") && getParamByName("lon")) {
  var pos = new L.LatLng(getParamByName("lat"), getParamByName("lon"));
}
if (getParamByName("z")) {
  var zoom = getParamByName("z");
}
if (getParamByName("t")) {
  var starttime = parseInt(getParamByName("t"));
}
var transitLayer = new TransitLayer({"time" : starttime, "statMode" : statMode});
var leafletTransitPlug = new T.Layer(transitLayer);

var trajClient = new TrajectoryClient("http://localhost:8989");
// var trajClient = new TrajectoryClient("http://panarea.informatik.uni-freiburg.de/routeplanner/ts_requestforwarder.php");
transitLayer.setTrajectoryClient(trajClient);

var map = L.map('map').setView(pos, zoom);
map.addLayer(oenvKarteLayer).addLayer(leafletTransitPlug);

var baseMaps = {
    "OpenStreetMap": osmLayer,
    "Public Transit Map" : oenvKarteLayer,
    "Google Maps": gmapLayer
};

L.control.layers(baseMaps).addTo(map);

transitLayer.addVehicleSelectListener(function(id) {
  transitLayer.clearVehicleTraj();
  clearVehicleWay();
  $("#bar").animate({"height":240}, 200, "swing", function() {
    trajClient.getTrajectoryStations(id, "window.showVehicleWay");
  });
  transitLayer.showVehicleTraj(id);
});

transitLayer.addTimeChangeListener(function() {
  var t = transitLayer.getCurTime();
  $("#clock").html(pad(t.getHours(),2) + ":" + pad(t.getMinutes(),2) + ":" + pad(t.getSeconds(),2));

  if (transitLayer.getTimeZone() !== undefined) {
    var lt = new Date(t.getTime() + transitLayer.getTimeZone().os * 1000);
    $("#localclock").html(pad(lt.getUTCHours(),2) + ":" + pad(lt.getUTCMinutes(),2) + ":" + pad(lt.getUTCSeconds(),2) + " (" + transitLayer.getTimeZone().c + ")");
  }else{
    $("#localclock").html("-");
  }
});

$("#bar #lineNumber").hide();
