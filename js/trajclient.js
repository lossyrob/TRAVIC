// Copyright 2014, University of Freiburg,
// Chair of Algorithms and Data Structures.
// Author: Patrick Brosi <brosip@informatik.uni-freiburg.de>

window.TrajectoryClient = function(url) {
  this._url = url;
};

TrajectoryClient.prototype.getVehiclePositions = function(swy, swx, ney, nex, date, time, z, cb) {
  var url = "/vehiclepos?";
  url += "swy=" + swy;
  url += "&swx=" + swx;
  url += "&ney=" + ney;
  url += "&nex=" + nex;
  url += "&date=" + date;
  url += "&time=" + time;
  url += "&z=" + z;
  url += "&cb=" + cb;

  return this._makeRequest(url);
}

TrajectoryClient.prototype.getTrajectories = function(swy, swx, ney, nex, orx, ory, btime, etime, date, z, cb, rid) {
  var url = "/trajectories";
  url += "?swy=" + swy;
  url += "&swx=" + swx;
  url += "&ney=" + ney;
  url += "&nex=" + nex;
  url += "&orx=" + orx;
  url += "&ory=" + ory;
  url += "&btime=" + btime;
  url += "&etime=" + etime;
  url += "&date=" + date;
  url += "&z="+ z;
  url += "&cb=" + cb;
  url += "&rid=" + rid;

  return this._makeRequest(url);
}

TrajectoryClient.prototype.getTrajectory = function(swy, swx, ney, nex, orx, ory, id, z, cb) {
  var url = "/trajectory";
  url += "?swy=" + swy;
  url += "&swx=" + swx;
  url += "&ney=" + ney;
  url += "&nex=" + nex;
  url += "&orx=" + orx;
  url += "&ory=" + ory;
  url += "&id=" + id;
  url += "&z="+ z;
  url += "&cb=" + cb;

  return this._makeRequest(url);
}

TrajectoryClient.prototype.getTrajectoryStations = function(id, cb) {
  var url = "/trajstations";
  url += "?id=" + id;
  url += "&cb=" + cb;

  return this._makeRequest(url);
}

TrajectoryClient.prototype._makeRequest = function(url) {
  var head = document.documentElement;
  var script = document.createElement("script");

  script.src = this._url + url;
  head.insertBefore(script, head.firstChild);
  if (window.lastScript) {
    head.removeChild(window.lastScript);
  }
  window.lastScript = script;

  return true;
}
