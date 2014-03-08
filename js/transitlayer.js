// Copyright 2014, University of Freiburg,
// Chair of Algorithms and Data Structures.
// Author: Patrick Brosi <brosip@informatik.uni-freiburg.de>

window.T = {};

T.Layer = L.Class.extend({
  includes: L.Mixin.Events,

  initialize: function(options) {
    this._startTime = options.time;
    this._animationStartTime = (new Date()).getTime();
    this._curHighLight = undefined;
    this._multiplicator = 1;
    this._updateTimeStep = 50;
    this._timeStep = this._updateTimeStep;
    this._markers = {};
    this._loadPerCycle = 1000;
    this._newLoadPerCycle = 1000;
    this._vehiclePosUpdateLock = false;
    this._lastTrajectoriesRID = 0;
    this._trajectoryClient = null;
    this._vehicleSelectListeners = new Array();
    this._timeChangeListeners = new Array();
    this._curTimeZone = {"os":0, "c":"UTC"};
    this._selectedVeh = undefined;
    this._vehicleCounter = 0;

    this._statMode = options.statMode;

    this._vehicleTypes = new Array("Tram", "Subway / Metro / S-Bahn", "Train", "Bus", "Ferry", "Cable Car", "Gondola", "Funicular");
    this._standardBgColor = new Array("#ffb400", "#ff5400", "#b5b5b5", "#b5b5b5", "#3000ff", "#ffb400", "#ffffff", "#ffffff");
    this._standardTextColor =  new Array("#000000", "#ffffff", "#000000", "#000000", "#3000ff", "#000000", "#000000", "#000000")
    this._timeStepArray = new Array(10000, 10000, 10000, 10000, 10000, 10000, 10000, 5000, 3000, 2000, 1000, 500, 400, 250, 170, 140, 120, 110, 85, 60, 50);

    this._padding = 10;
    this._pulseEnabled = false;

    this._oldTime = this._getCurTime();

    // stuff for statistics
    this._currentTimeSum = 0;
    this._currentTimeSampleCounter = 0;
  },

  getTimeZone : function() {
    return this._curTimeZone;
  },

  getCurTime : function() {
    return this._oldTime;
  },

  getMultiplicator: function() {
    return this._multiplicator;
  },

  setMultiplicator: function(m) {
    if (m < 0.5) m=0.5;
    if (m > 120) m = 120;
    this._startTime = this._getCurTime().getTime();
    this._animationStartTime = (new Date()).getTime();
    this._multiplicator = m;
  },

  setCurrentTime: function() {
    this._startTime = (new Date()).getTime();
    this._animationStartTime = (new Date()).getTime();
    clearTimeout(this._partialTrajLoadTimer);
    this._requestTrajectories(true);
  },

  addVehicleSelectListener: function(l) {
    this._vehicleSelectListeners.push(l);
  },

  addTimeChangeListener: function(l) {
    this._timeChangeListeners.push(l);
    l();
  },

  setTrajectoryClient: function(trajC) {
    this._trajectoryClient = trajC;
  },

  onAdd: function (map) {
    this._map = map;
    this._map._transitLayer = this;
    this._raphaelRoot = map._panes.overlayPane;
    this._paper = Raphael(this._raphaelRoot);
    map.on('moveend', this._setMoveEnd);
    map.on('movestart', this._setMoveStart);
    map.on('zoomstart',this._setZoomStart);

    this._updateRaphaelViewport();
    this._requestTrajectories();
  },

  onRemove: function(map) {
    this._map = null;
    this._paper.clear();
    this._markers = {};
    clearTimeout(this._transitLayer._partialTrajLoadTimer);
  },

  _updateRaphaelViewport: function () {
    var size = this._map.getSize();
    var panePosition = L.DomUtil.getPosition(this._map._mapPane);
    var minPos = panePosition.multiplyBy(-1);
    var maxPos = minPos.add(size);
    var newWidth = maxPos.x - minPos.x;
    var newHeight = maxPos.y - minPos.y;
    var root = this._raphaelRoot;
    var pane = this._map._panes.overlayPane;

    this._paper.setSize(newWidth, newHeight);
    L.DomUtil.setPosition(root, minPos);
    root.setAttribute('width', newWidth);
    root.setAttribute('height', newHeight);
    this._paper.setViewBox(minPos.x, minPos.y, newWidth, newHeight, false);
  },

  _updtVehTrajsList: function(json) {
    $("#footLoading").hide();
    var rid = json.rid;
    if (rid != this._lastTrajectoriesRID) {
      return;
    }
    this._trajectories = json.a;
    this._curTimeZone = json.tz[0];
    time = this._getCurDTime();

    for (var i=0, len=this._trajectories.length; i<len;++i) {
      var curT = this._trajectories[i];
      var curM = this._markers[curT.id];
      if (curM !== undefined && curT.pts[0][0].at <= time) {
        curT.marker = curM;
        curM.data("hold", true);
      }
    }

    for (var i in this._markers) {
      var curM = this._markers[i];
      if (!(curM.data("hold"))) {
        if (curM.data("textOb") !== undefined) {
          curM.data("textOb").remove();
        }
        curM.remove();
        delete this._markers[i];
      }else{
        curM.data("hold", false);
      }
    }

    this._updtVehTrajs();
  },

  _getTimeStep : function(z) {
    var ret = this._timeStepArray[z];
    return Math.min(1000, Math.max(60, ret / this._multiplicator));
  },

  _getDistance : function(start, end) {
    if (start.p !== undefined) start = start.p;
    if (end.p !== undefined) end = end.p;
    return Math.sqrt((start[0] - end[0])* (start[0] - end[0]) + (start[1] - end[1])* (start[1] - end[1]));
  },

  _getVehiclePositionAtTime: function(time, trajectory) {
    var curPt, curPos;
    if (trajectory.curPt === undefined) curPt = 0;
    else curPt = trajectory.curPt;

    if (trajectory.curPos === undefined) curPos = 0;
    else curPos = trajectory.curPos;

    for (var i=curPt, len=trajectory.pts.length;i<len;++i) {
      trajectory.curPt = i;
      var curTrajPart = trajectory.pts[i];
      var j = curPos;
      var curP = -1, lastP = -1, curTp = -1, lastTp = -1, curDist = 0, distTemp = 0;
      while(j < curTrajPart.length) {
        lastP = curP;
        curP = j;
        if (lastP > -1) distTemp += this._getDistance(curTrajPart[lastP], curTrajPart[curP]);
        if (curTrajPart[curP].dt !== undefined) {
          lastTp = curTp;
          curTp = curP;
          curDist = distTemp;
          distTemp = 0;
          if (curTrajPart[curP].dt > time) break;
        }
        j++;
      }

      var curWp = curTrajPart[curTp];

      if (curTp < 0 || curWp.dt < time) continue;

      if (curWp.at < time) {
        trajectory.curPos = curTp;
        return curWp.p;
      }

      if (lastTp < 0) continue;

      var lastWp = curTrajPart[lastTp];
      var mustBeDistance = curDist * ((time - lastWp.dt) / (curWp.at - lastWp.dt));

      return this._interpolate(trajectory, curTrajPart, lastTp, curTp, mustBeDistance);
    }

    return false;
  },

  _interpolate: function(trajectory, trajPart, lastTpI, curTpI, projDist) {
      var d = 0;
      var prevD = 0;

      for (var x = lastTpI+1; x <= curTpI;++x) {
        prevD = d;
        var last = trajPart[x];
        var prev = trajPart[x-1];
        d += this._getDistance(prev, last);
        if (d >= projDist) {
          var distLeft = projDist - prevD;

          if (last.p !== undefined) last = last.p;
          if (prev.p !== undefined) prev = prev.p;

          if (distLeft <= 0) return last;

          var x1 = prev[0];
          var y1 = prev[1];
          var x2 = last[0];
          var y2 = last[1];

          var dx = x2-x1;
          var dy = y2-y1;

          var b = Math.sqrt(dx*dx + dy*dy) / distLeft;

          trajectory.curPos = lastTpI;
          return [x1+(dx/b), y1+(dy/b)];
        }
      }
    return false;
  },

  _updtVehTrajsPartial: function(pos, load, timestep) {

    // statistics timer
    var statsTimer = new Date();

    var time = this._getCurDTime();

    for(var j=0, i = pos, len = this._trajectories.length; i<len && j<load;++i,++j) {
      var curT = this._trajectories[i];
      var curPts = curT.pts;

      if (curPts[0][0].at > time) continue;
      if (curT.marker !== undefined) {
        var lastPrtTr = curPts[curPts.length-1];
        var lastPt = lastPrtTr[lastPrtTr.length-1];
        if (lastPt.dt < time) {
          if (curT.marker.data("textOb") !== undefined)
            if (lastPt.t == 2) curT.marker.data("textOb").animate({opacity:0}, 500, "linear", function() {this.remove();});
            else curT.marker.data("textOb").remove();

          if (lastPt.t == 2) curT.marker.animate({opacity:0}, 500, "linear", function() {this.remove();});
          else curT.marker.remove();

          delete this._markers[curT.id];
          delete curT.marker;
        }
      }

      var p = this._getVehiclePositionAtTime(time, curT);

      if (p) {
        this._vehicleCounter++;
        if (curT.marker === undefined) {
          curT.marker = this._getVehicleMarker(p, curT);
          this._markers[curT.id] = curT.marker;
          if (curPts[0][0].t == 1) {
            curT.marker.attr({opacity:0});
            curT.marker.animate({opacity:1}, 500, "linear");
          }
        }else{
          curT.marker.attr('cx', p[0]).attr('cy', p[1]);
          if (curT.marker.data("textOb") !== undefined)
            curT.marker.data("textOb").attr('x',p[0]).attr('y', p[1]);
        }
      }else if (curT.marker !== undefined) {
        if (curT.marker.data("textOb") !== undefined)
          curT.marker.data("textOb").remove();
        curT.marker.remove();
        delete this._markers[curT.id];
        delete curT.marker;
      }
    }

    var l = this;

    this._currentTimeSum += new Date() - statsTimer;

    if (i < this._trajectories.length) {
      this._partialTrajLoadTimer = setTimeout(function() {
        l._updtVehTrajsPartial(pos+load, load, timestep);
      }, timestep);
    } else {

      //////

      if (this._statMode) {
        this._currentTimeSampleCounter++;
        if (this._currentTimeSampleCounter == 50) {
          var statmsg = "avg refresh time is " + (this._currentTimeSum / 100);
          statmsg += "\n"+("timestep is " + timestep);
          statmsg += "\n"+("time consumed per second is " + (1000 / timestep) * (this._currentTimeSum / 100));
          statmsg += "\n"+("zoom level is " + this._map.getZoom());
          statmsg += "\n"+("number of vehicles is " + this._vehicleCounter);
          alert(statmsg);
          this._currentTimeSampleCounter = 0;
          this._currentTimeSum = 0;
        }
      }

      //////


      this._vehicleCounter = 0;
      this._partialTrajLoadTimer = setTimeout(function() {
        l._loadPerCycle = l._newLoadPerCycle;
        l._updtVehTrajs();
        l._timeStep = l._getTimeStep(l._map.getZoom());
      }, timestep);
    }
  },

  _updtVehTrajs: function() {
    if (this._getCurTime() > this._trajectoryEndTime-(1000*this._multiplicator)) {
      this._requestTrajectories();
      return;
    }
    var utime = this._timeStep;

    var timestep = utime / Math.max(1, (this._trajectories.length)/this._loadPerCycle);
    this._updtVehTrajsPartial(0, this._loadPerCycle, timestep);
  },

  _getCurTime: function() {
    return new Date(this._startTime + this._multiplicator*((new Date()).getTime() - this._animationStartTime));
  },

  _getCurDTime: function() {
    var time = this._getCurTime();
    if (time.getSeconds() != this._oldTime.getSeconds())
      for (var i = 0; i < this._vehicleSelectListeners.length; i++)
        this._timeChangeListeners[i]();
    this._oldTime = time;
    return time.getTime() / 1000;
  },

  _requestTrajectories: function() {
    $("#footLoading").show();
    var bounds = this._map.getBounds();
    this._lastTrajectoriesRID++;

    var bTime = this._getCurTime();
    var or = this._map.getPixelOrigin();
    var l = this;
    var sw = this._map.project(bounds.getSouthWest());
    var ne = this._map.project(bounds.getNorthEast());

    window._updtVehTrajsListDummy = function(json) {
      l._updtVehTrajsList(json);
    }

    this._trajectoryEndTime = new Date(bTime.getTime() + (this._multiplicator*10*1000));
    this._trajectoryClient.getTrajectories(
                                sw.x - this._padding,
                                sw.y + this._padding,
                                ne.x + this._padding,
                                ne.y - this._padding,
                                or.x,
                                or.y,
                                bTime.getUTCHours() + ":" + bTime.getUTCMinutes() + ":" + bTime.getUTCSeconds() + "." + (bTime.getUTCMilliseconds()*10),
                                this._trajectoryEndTime.getUTCHours() + ":" + this._trajectoryEndTime.getUTCMinutes() + ":" + this._trajectoryEndTime.getUTCSeconds() + "." + (this._trajectoryEndTime.getUTCMilliseconds()*10),
                                bTime.getUTCFullYear() + "" + pad(bTime.getUTCMonth() + 1, 2) + "" + pad(bTime.getUTCDate(), 2),
                                this._map.getZoom(),
                                "window._updtVehTrajsListDummy",
                                this._lastTrajectoriesRID
                                );
  },

  _setMoveEnd: function() {
    this._transitLayer._timeStep = this._transitLayer._updateTimeStep;
    this._transitLayer._updateRaphaelViewport();
    this._transitLayer._newLoadPerCycle = 1000;
    clearTimeout(this._transitLayer._partialTrajLoadTimer);
    this._transitLayer._requestTrajectories(true);
    if (this._transitLayer._curHighLight !== undefined) {
      this._transitLayer.showVehicleTraj(this._transitLayer._curHighLight, true);
    }
  },

  _setMoveStart: function() {
    clearTimeout(this._transitLayer._partialTrajLoadTimer);
    this._transitLayer._loadPerCycle = 100;
    this._transitLayer._newLoadPerCycle = 100;
    this._transitLayer._updtVehTrajs();
  },

  _setZoomStart: function() {
    clearTimeout(this._transitLayer._partialTrajLoadTimer);
    this._transitLayer._paper.clear();
    this._transitLayer._markers = {};
  },

  _latLngToPoint : function(ll) {
    return this._map.project(L.latLng(ll))._subtract(this._map.getPixelOrigin());
  },

  _drawTrajectory : function(traj, noAni) {
    if (traj.id != this._curHighLight) return;
    var pString = "";
    for (var i=0; i<traj.pts.length;i++) {
      var curPart = traj.pts[i];
      for (var j=0;j<curPart.length;j++) {
        var curP;
        if (curPart[j].p === undefined) curP = curPart[j];
        else curP = curPart[j].p;

        if (j == 0) pString += "M" + curP[0] + "," + curP[1];
        else pString += "L" + curP[0] + "," + curP[1];
      }
    }

    if (this._highlightPath !== undefined) this._highlightPath.remove();
    this._highlightPath = this._paper.path(pString).attr({'stroke-width' : 6,
                                                          'stroke' : '#fff600',
                                                          'stroke-linecap' : 'round',
                                                          'stroke-linejoin' : 'bevel',
                                                          'z-index':998
                                                        });

    var st = this._paper.set();

    for (var i=0; i<traj.pts.length;i++) {
      var curPart = traj.pts[i];
      for (var j=0;j<curPart.length;j++) {
        var curP;
        if (curPart[j].p !== undefined) {
          curP = curPart[j].p;
          if (curPart[j].n !== undefined) {
            st.push(this._paper.circle(curP[0], curP[1], 6)
                    .attr({"fill": "#fff600",
                           "stroke": "#000",
                           "stroke-width": 0,
                           'z-index':999
                    }));
          }
        }
      }
    }
    if (this._stationLabelSet !== undefined) this._stationLabelSet.remove();
    this._stationLabelSet = st;
    if (this._markers[traj.id]) {
      this._markers[traj.id].toFront();
      if (this._markers[traj.id].data("textOb")) this._markers[traj.id].data("textOb").toFront();
    }
  },

  _formatDelayTime : function(d) {
    if (d >= 600000) return (d / (60*10000)).toFixed(1);
    return (d / 10000).toFixed(0) + "s";
  },

  unselectVehicle : function() {
    if (this._selectedVeh) {
      this._selectedVeh.data("selected", false);
      this._selectVeh = undefined;
      this._unhighlightVehicle(this._selectedVeh);
    }
  },

  clearVehicleTraj : function() {
    delete this._curHighLight;
    if (this._highlightPath !== undefined) {
      this._highlightPath.remove();
      delete this._highlightPath;
    }
    if (this._stationLabelSet !== undefined) {
      this._stationLabelSet.remove();
      delete this._stationLabelSet;
    }
  },

  showVehicleTraj : function(id, noAni) {
    var bounds = this._map.getBounds();
    var swp = this._map.project(bounds.getSouthWest());
    var nep = this._map.project(bounds.getNorthEast());
    var or = this._map.getPixelOrigin();
    var d = new Date();

    var l = this;
    this._curHighLight = id;

    window._drawTrajectoryDummy = function(json) {
      l._drawTrajectory(json, noAni);
    }

    this._trajectoryClient.getTrajectory(
                                swp.x,
                                swp.y,
                                nep.x,
                                nep.y,
                                or.x,
                                or.y,
                                id,
                                this._map.getZoom(),
                                "window._drawTrajectoryDummy"
                                );
  },

  _selectVehicle : function(circ) {
    if (this._selectedVeh) this.unselectVehicle();
    this._selectedVeh = circ;
    for (var i = 0; i < this._vehicleSelectListeners.length; i++)
      this._vehicleSelectListeners[i](circ.data("id"));
    circ.attr("r", 15);
    circ.attr("stroke-width", 3);
    circ.data("selected", true);
  },

  _getVehicleText: function(lbl, r, color, p, circ) {
    if (lbl.length > 3) lbl=lbl.substring(0,1);
    var l = this;
    var t = this._paper.text(p[0], p[1], lbl).attr({"fill": color,
                                                  "font-size": (lbl.length == 3) ? r - 2: r+2,
                                                  "font-family": "Trebuchet MS, Helvetica, sans-serif",
                                                  'cursor': 'pointer',
                                            })
                                            .mouseover(function() {
                                              l._highlightVehicle(circ, 15);
                                            })
                                            .mouseout(function() {
                                              l._unhighlightVehicle(circ);
                                            })
                                            .click(function() {
                                              l._selectVehicle(circ);
                                            });
    return t;
  },

  _getVehicleMarker: function(p, vehicle) {
    var color = this._standardBgColor[vehicle.t];
    var textcolor = this._standardTextColor[vehicle.t];
    var lbl = "";
    if (vehicle.sn) lbl = vehicle.sn;
    if (vehicle.c && vehicle.c != "") color = "#" + vehicle.c;
    if (vehicle.tc && vehicle.tc != "") textcolor = "#" + vehicle.tc;

    var rad = this._getPWidth(vehicle.t);
    var l = this;

    var circ = this._paper.circle(p[0], p[1], rad)
                  .attr({"fill": "#fff",
                         "stroke": "#000",
                         "stroke-width": 2,
                         "fill": color,
                         'cursor': 'pointer',
                         'title': vehicle.id + "\n" + vehicle.hs + "\n" + vehicle.ln + "\ntype: " + vehicle.t,
                  });
    circ.data('lbl', lbl);
    circ.data('veh', vehicle);

    if (rad > 8 && lbl != "") {
      var textOb = this._getVehicleText(lbl, rad, textcolor, p, circ);
      circ.data('textOb', textOb);
      textOb.toFront();
    }

    circ.mouseover(function() {
      l._highlightVehicle(this, 15);
    });

    circ.mouseout(function() {
      l._unhighlightVehicle(this);
    });

    circ.click(function() {
      l._selectVehicle(this);
    });

    return circ.data('id', vehicle.id);
  },

  _highlightVehicle: function(veh, r) {
    veh.stop();

    if (veh.data("textOb") === undefined) {
      var textC = this._standardTextColor[veh.data("veh").t];
      if (veh.data("veh").tc) textC = veh.data("veh").tc;
      var textOb = this._getVehicleText(veh.data("lbl"), veh.attr('r'), textC, new Array(veh.attr('cx'), veh.attr('cy')), veh);
      veh.data("textOb", textOb);
      veh.data("textOb").toFront();
    }
    veh.data("textOb").stop();
    // buggy in opera and IE, maybe in other browsers too

    if (window.chrome || window.mozInnerScreenX != null) {
      veh.toFront();
      veh.data("textOb").toFront();
    }

    if (veh.data("textOb").attr("text").length == 3) veh.data("textOb").animate({'font-size' : r}, 150);
    else veh.data("textOb").animate({'font-size' : r + 2}, 150);

    if (this._pulseEnabled && veh.data("pulse") === undefined && !veh.data("pulsed")) {
      veh.data("pulse", this._paper.circle(veh.attrs.cx, veh.attrs.cy, veh.attrs.r));
      veh.data("pulse").attr({'opacity' : 0.7});
      veh.data("pulsed", true);
      veh.data("pulse").animate({'r' : 30, 'opacity' : 0}, 500, ">", function() {this.remove; veh.removeData("pulse");});
    }

    veh.animate({'r' : r}, 150);
  },

  _unhighlightVehicle: function(veh) {
    if (veh.data("selected")) return;
    if (!veh.data("veh")) return;
    var r = this._getPWidth(veh.data("veh").t);
    veh.stop();
    veh.animate({'stroke-width':2, 'r' : r}, 150, "linear", function() {veh.data("pulsed", false);});
    if (veh.data("textOb") !== undefined) {
      veh.data("textOb").stop();
      var rad;
      if (veh.data("textOb").attr("text").length == 3) rad = r - 2;
      else rad = r + 2;

      veh.data("textOb").animate({'font-size' : (rad < 8 ? 8 : rad)}, 150, "linear", function() {
        if (r < 9) {
          this.remove();
          veh.data("textOb", undefined);
        }
      });
    }
  },

  _getPWidth: function(type) {
    z = this._map.getZoom();
    switch(type) {
      case 0:
        // tram
        return Math.min(11, parseInt((z-1)*(z-1) / 27));
      break;
      case 1:
        // metro
        return Math.min(11, parseInt(z*z / 23));
      break;
      case 2:
        // train
        return Math.max(3, Math.min(11, parseInt(z*z / 14)));
      break;
      case 3:
        // bus
        return Math.min(11, parseInt((z-2)*(z-2) / 26));
      break;
      case 4:
        // ferry
        return Math.min(11, parseInt(z*z / 23));
      break;
      case 5:
        // cable
        return Math.min(11, parseInt((z-2)*(z-2) / 24));
      break;
      case 6:
        // gondola
        return Math.min(11, parseInt((z-2)*(z-2) / 24));
      break;
      case 7:
        // funicular
        return Math.min(11, parseInt((z-2)*(z-2) / 24));
      break;
    }
    return 1;
  },

  getStandardBgColor: function(t) {
    return this._standardBgColor[t];
  },

  getStandardTextColor: function(t) {
    return this._standardTextColor[t];
  },

  getVehicleTypeName: function(t) {
    return this._vehicleTypes[t];
  },

  _getTimeString: function(t) {
    var h = t / 36000000 >> 0;
    var m = (t % 36000000) / 600000 >> 0;
    var s = (((t % 36000000) % 600000) / 10000) >> 0;

    if (s == 0 ) return pad(h, 2) + ":" + pad(m, 2);
    return pad(h, 2) + ":" + pad(m, 2) + ":" + pad(s, 2);
  },

   _getDelayString: function(t) {
    var h = t / 36000000 >> 0;
    var m = (t % 36000000) / 600000 >> 0;
    var s = (((t % 36000000) % 600000) / 10000) >> 0;

    if (s == 0 && h == 0) return pad(m, 2) + "m";
    if (s == 0) return pad(h, 2) + "h" + pad(m, 2) + "m";
    if (m == 0 && h==0) return pad(s, 2) + "s";
    if (h == 0) return pad(m, 2) + "m" + pad(s, 2) + "s";
    return pad(h, 2) + "h" + pad(m, 2) + "m" + pad(s, 2) + "s";
  }
});

function pad(a,b){return(1e15+a+"").slice(-b)}
