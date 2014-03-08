// Copyright 2014, University of Freiburg,
// Chair of Algorithms and Data Structures.
// Author: Patrick Brosi <brosip@informatik.uni-freiburg.de>

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
  $("#bar #lineVerlauf #lineVerlaufScroll").jScrollPane({"animateScroll":true});
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

window.showVehicleWay = function(w) {
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
  if (w.tt.t == 31) opStr += "monday till friday";
  else if (w.tt.t == 64) opStr += "sundays";
  else if (w.tt.t == 32) opStr += "saturdays";
  else if (w.tt.t == 96) opStr += "weekends";
  else if (w.tt.t == 127) opStr += "daily";
  else {
    var dayMap = new Array("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday");
    var map = Number(w.tt.t).toString(2);
    var first = false;
    for (var i=0; i < 7; i++) {
      if (map.charAt(i) == "1") {
        if (first) opStr += ", ";
        first = true;
        opStr += dayMap[i];
      }
    }
  }

  if (w.tt.p.length > 0) {
    var posDays = "";
    for (var i=0; i < w.tt.p.length; i++) {
      posDays += w.tt.p[i].y + 1900 + "/" + w.tt.p[i].m + "/" + w.tt.p[i].d;
      if (i < w.tt.p.length-1) posDays += ", ";
    }
    if (w.tt.p.length > 10) {
      if (w.tt.t == 0) opStr += "irregularly";
      else opStr += " (irregular additional services)";
    }else{
      if (w.tt.t == 0) opStr += posDays;
      else opStr += ". Additional service on " + posDays + ".";
    }
  }

  if (w.tt.n.length > 0) {
    var negDays = "";
    for (var i=0; i < w.tt.n.length; i++) {
      negDays += w.tt.n[i].y + 1900 + "/" + w.tt.n[i].m + "/" + w.tt.n[i].d;
      if (i < w.tt.n.length-1) negDays += ", ";
    }
    opStr += " (no service on " + negDays + ")";
  }

  $("#bar #lineTravelTimes").html(opStr);
  $("#bar #lineVerlauf ul").html("");
  $("#bar #lineVerlauf ul").css("width", w.sts.length*70 + 50 + "px");
  showVehicleStations(w);
};

$("#slowerbut").click(function() {
  transitLayer.setMultiplicator(transitLayer.getMultiplicator() - 0.5);
  $("#speedoview").html(transitLayer.getMultiplicator() + "x");
});

$("#normalbut").click(function() {
  transitLayer.setMultiplicator(1);
  $("#speedoview").html(transitLayer.getMultiplicator() + "x");
});

$("#fasterbut").click(function() {
  transitLayer.setMultiplicator(transitLayer.getMultiplicator() + 0.5);
  $("#speedoview").html(transitLayer.getMultiplicator() + "x");
});

$("#currenttime").click(function() {
  transitLayer.setCurrentTime();
  transitLayer.setMultiplicator(1);
  $("#speedoview").html("1x");
});

$("#barclosebut").click(function() {
  $("#bar").animate({"height":0}, 200, "swing");
  transitLayer.clearVehicleTraj();
  transitLayer.unselectVehicle();
});

function getParamByName(name) {
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location);
  if (results == null) return "";
  else return decodeURIComponent(results[1].replace(/\+/g, " "));
}

var gmapLayer = new L.Google('HYBRID');
var osmLayer = new L.TileLayer('http://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '',
          maxZoom: 20
      });
var oenvKarteLayer = new L.TileLayer('http://tile.memomaps.de/tilegen/{z}/{x}/{y}.png', {
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
var transitLayer = new T.Layer({"time" : starttime, "statMode":statMode});

var trajClient = new TrajectoryClient("http://localhost:8989");
// var trajClient = new TrajectoryClient("http://panarea.informatik.uni-freiburg.de/routeplanner/ts_requestforwarder.php");
transitLayer.setTrajectoryClient(trajClient);

var map = L.map('map').setView(pos, zoom);
map.addLayer(osmLayer).addLayer(transitLayer);

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
