TransitLayer.prototype._getPWidth = function(type) {
  z = this._curZoom;
  switch(type) {
    case 0:
      // tram
      return 5;
    case 1:
      // metro
      switch(z) {
        case 5: return 9;
        case 4: return 7;
        case 3: return 5;
        case 2: return 4;
        case 1: return 3;
        case 0: return 3;
      }
    case 2:
      // train
      switch(z) {
        case 5: return 11;
        case 4: return 11;
        case 3: return 8;
        case 2: return 6;
        case 1: return 3.5;
        case 0: return 3;
      }
    case 3:
      // bus
      return 4;
    default:
      // rest
      switch(z) {
        case 5: return 7;
        case 4: return 5.5;
        case 3: return 4;
        case 2: return 3;
        case 1: return 3;
        case 0: return 2.5;
      }
  }
  return 1;
}

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
          var point = new OpenLayers.LonLat(curStation.p[0], curStation.p[1]);
          map.panTo(point);
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

var map = new OpenLayers.Map('map', {
  extent : [420000, 30000, 900000, 350000],
  maxExtent : [420000, 30000, 900000, 350000],
  resolutions : [750,500,250,100,50,20]
});

var attribution = "&copy; SBB/CFF/FFS";

var sbb_relief =  new OpenLayers.Layer.WMTS ({
  url: ['http://map1.trafimage.ch/main/tilecache', 'http://map2.trafimage.ch/main/tilecache', 'http://map3.trafimage.ch/main/tilecache'],
  displayInLayerSwitcher: false,
  requestEncoding: 'REST',
  buffer: 0,
  style: 'default',
  dimensions: ['TIME'],
  params: {
      'time': '2012'
  },
  maxExtent: new OpenLayers.Bounds(420000, 30000, 900000, 350000),
  resolutions: [750, 500, 250, 100, 50,20],
  matrixSet: 'swissgrid_50',
  projection: new OpenLayers.Projection("EPSG:21781"),
  units: "m",
  formatSuffix: 'png',
  ref: "netzkarte_relief",
  name: OpenLayers.i18n('netzkarte_relief'),
  attribution: attribution,
  mapserverLayers: 'netzkarte_raster_relief',
  resolutions: [750, 500, 250, 100, 50, 20],
  matrixSet: 'swissgrid_20',
  layer: 'netzkarte_raster_relief',
  formatSuffix: 'jpeg',
  group: 'background',
  visibility: true,
  isBaseLayer: true
});

var starttime = (new Date()).getTime();
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


var epsg4326 = new OpenLayers.Projection("EPSG:4326");
var zurich = new OpenLayers.LonLat(653176.34, 227279.43);

map.addLayer(sbb_relief);
map.setCenter(zurich, 3);

var transitLayer = new TransitLayer({"time" : starttime, "statMode" : false});
transitLayer._timeStepArray = new Array(3000, 2000, 500, 300, 200, 200);
transitLayer._standardTextColor =  new Array("#000000", "#000000", "#000000", "#000000", "#f4f4f4", "#000000", "#000000", "#000000")

var trajClient = new TrajectoryClient("http://localhost:8989");
//var trajClient = new TrajectoryClient("http://panarea.informatik.uni-freiburg.de/routeplanner/ts_requestforwarder.php");
transitLayer.setTrajectoryClient(trajClient);

transitlayer = new OpenLayers.Layer.TransitLayer("transit", {"transitLayer" : transitLayer});
map.addLayer(transitlayer);

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
