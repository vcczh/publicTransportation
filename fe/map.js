$('#StopTable').hide();
$('#st').dataTable( {
  "iDisplayLength": 25,
  "aaSorting": [[ 1, "asc" ]],
  "fnRowCallback": function( nRow, aData, iDisplayIndex ) {
     nRow.className = aData[1 /* or whatever */] < getTimeString() ? "passed" : "unpassed";
     return nRow;
  } 
} );

var exampleNS = {};
var LosAngeles = ol.proj.transform([-118.243683, 34.052235], 'EPSG:4326', 'EPSG:3857');

exampleNS.getRendererFromQueryString = function() {
  var obj = {}, queryString = location.search.slice(1),
      re = /([^&=]+)=([^&]*)/g, m;

  while (m = re.exec(queryString)) {
    obj[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
  }
  if ('renderers' in obj) {
    return obj['renderers'].split(',');
  } else if ('renderer' in obj) {
    return [obj['renderer']];
  } else {
    return undefined;
  }
};

var raster = new ol.layer.Tile({
  title: "Transportation map",
  type: "base",
  name: "transport",
  //visible: "transport" == layer,
  source: new ol.source.XYZ({
      urls: ["http://a.tile.thunderforest.com/transport/{z}/{x}/{y}.png", "http://b.tile.thunderforest.com/transport/{z}/{x}/{y}.png", "http://c.tile.thunderforest.com/transport/{z}/{x}/{y}.png"],
      attributions: [new ol.Attribution({
          html: 'Map data © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, Transportation map tiles by <a href="http://www.thunderforest.com/">Andy Allan</a>'
      })]
  })
});

var color = '#ffcc33';
var imageStyle = new ol.style.Circle({
  radius: 5,
  snapToPixel: false,
  fill: new ol.style.Fill({color: 'yellow'}),
  stroke: new ol.style.Stroke({color: 'red', width: 1})
});

var MLimitedLStyle = new ol.style.Circle({
  radius: 5,
  snapToPixel: false,
  fill: new ol.style.Fill({color: '#CCEEFF'}),
  stroke: new ol.style.Stroke({color: 'red', width: 1})
});

var MExpressLStyle = new ol.style.Circle({
  radius: 5,
  snapToPixel: false,
  fill: new ol.style.Fill({color: 'gray'}),
  stroke: new ol.style.Stroke({color: 'red', width: 1})
});

var MLocalLStyle = new ol.style.Circle({
  radius: 5,
  snapToPixel: false,
  fill: new ol.style.Fill({color: 'blue'})
});

var stopStyle = new ol.style.Circle({
  radius: 5,
  snapToPixel: false,
  fill: new ol.style.Fill({color: 'red'})
});

var styles = {
  'Point': [new ol.style.Style({
    image: imageStyle
  })],
  'Stop': [new ol.style.Style({
    image: stopStyle
  })],
  'Metro Limited Line':[new ol.style.Style({
    image: MLimitedLStyle
  })],
  'Metro Express Line':[new ol.style.Style({
    image: MExpressLStyle
  })],
  'Metro Local Line':[new ol.style.Style({
    image: MLocalLStyle
  })],
  'LineString': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'green',
      width: 5
    })
  })]
};

var iconFeatures=[];
var vectorSource = new ol.source.Vector({
  features: iconFeatures //add an array of features
});
var stopFeatures=[];


var styleFunction = function(feature, resolution) {
  if (!feature.getStyle()){
    return styles[feature.getGeometry().getType()];
  }else{
    return feature.getStyle();
  }
    
};


var vectorLayer = new ol.layer.Vector({
  source: vectorSource,
  style: styleFunction
});


var view = new ol.View({
    center: LosAngeles,
    zoom: 10
  });

var map = new ol.Map({
  layers: [ raster, vectorLayer ],
  renderer: exampleNS.getRendererFromQueryString(),
  target: 'map',
  controls: ol.control.defaults({
    attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
      collapsible: false
    })
  }),
  view: view
});

var dtInit = false;
var now = new Date();
var select = new ol.interaction.Select();

var clickPlot = function(evt){
  var featureId = evt.element.getId();
  //console.log(feature);
  if (gflag == 0){
    var feature = pre_running[featureId];
    var url = 'http://api.metro.net/agencies/lametro/routes/'+feature.route_id +'/sequence/';
    var callback = function(data, status){
      if (status == 'success'){
        //console.log(data.items);
        var stopsSeq = [];
       $('#st').dataTable().fnClearTable();
        data.items.forEach(function(entry){
          $('#st').dataTable().fnAddData([entry.display_name, "N/A"]);
          stopsSeq.push(new ol.proj.transform( [entry.longitude, entry.latitude], 'EPSG:4326', 'EPSG:3857'));
        });
        plotLine(stopsSeq);
        $('#StopTable').effect('slide', { direction: 'right', mode: 'show' }, 500);
        //console.log(stopsSeq.pop());
      }
    };
    $.get(url,callback);
  }else{
    var vehicle = vmap[featureId];
    if (vehicle){
      console.log(vehicle);
      var stopsSeq = [];

      var vehInfo = getVehicleInfo(vehicle);
      $('#veh_info').html(vehInfo);
      $('#st').dataTable().fnClearTable();
      if (stopFeatures.length != 0){
        stopFeatures.forEach(function(feature){
          vectorSource.removeFeature(feature);
        });
        stopFeatures = [];
      }
      vehicle.stops.forEach(function(entry){
        $('#st').dataTable().fnAddData([entry.STOP_NAME, entry.ARRIVAL_TIME]);
        plot(entry.STOP_LON, entry.STOP_LAT, entry.STOP_ID, 'Stop');
        //stopsSeq.push(new ol.proj.transform( [entry.STOP_LON, entry.STOP_LAT], 'EPSG:4326', 'EPSG:3857'));
      });
      
      if (routeShapes[vehicle.SHAPE_ID]){
        routeShapes[vehicle.SHAPE_ID].forEach(function(entry){
          stopsSeq.push(new ol.proj.transform( [entry[1], entry[0]], 'EPSG:4326', 'EPSG:3857'));
        });
        plotLine(stopsSeq);
      }else{
        var callback = function(data, status){
          if (status == 'success'){
            //console.log(data);
            routeShapes[vehicle.SHAPE_ID] = data;
            data.forEach(function(entry){
              stopsSeq.push(new ol.proj.transform( [entry[1], entry[0]], 'EPSG:4326', 'EPSG:3857'));
            });
            console.log(stopsSeq);
            stopsSeq.pop();
            plotLine(stopsSeq);
          }
        }
        $.post('getRouteShape',{SHAPE_ID: vehicle.SHAPE_ID}, callback);
      }
      $('#StopTable').effect('slide', { direction: 'right', mode: 'show' }, 500);
    }else{  //  Stops

    }   
  }
  
};

function getVehicleInfo(vehicle){
  var ret = '';
  ret = '<h>   HeadSign: '+vehicle.STOP_HEADSIGN+'</h><br />';
  ret += '<h>   Short Name: ' + vehicle.ROUTE_SHORT_NAME +'</h><br />';
  ret += '<h>   Long Name: ' + vehicle.ROUTE_LONG_NAME +'</h><br />';
  ret += '<h>   Route_Id: ' + vehicle.ROUTE_ID + '</h><br />';
  ret += '<h>   Service_Id: ' + vehicle.SERVICE_ID +'</h><br />';
  ret += '<br />';
  return ret;
}

var selected_feature = select.getFeatures();
selected_feature.on('add', clickPlot);
map.addInteraction(select);

var pre_running = {};
var running_vehicle = {};
function displayCurrentTransit(){
  //clearVectorSource();
  var colorcode = 0;
  var callback = function(data, status){
    if (status == "success"){
      console.log(data.items.length);
      running_vehicle = {};
      data.items.forEach(function(entry){
        running_vehicle[entry.id] = entry;
        if (entry.id in pre_running ){
          delete pre_running[entry.id];
        }
        plot(entry.longitude, entry.latitude, entry.id);
      });
      for (var key in pre_running) {
        console.log("remove "+key);
        vectorSource.removeFeature(vectorSource.getFeatureById(key) );
      }
      pre_running = running_vehicle;
    }else{
      console.log(status);
    }
  }
  var url = 'http://api.metro.net/agencies/lametro/vehicles';
  console.log("Ajax call: "+url);
  $.get(url,callback);
};

var intervalID = '';
var vehicles = {};
var routeShapes = {};
var gflag = 1;
  
function clickStartCurrentTransit(){
  console.log('Start running.');
  if(gflag == 0){
    console.log('Calling Live feed.');
    intervalID = setInterval(displayCurrentTransit, 1000);
  }else{
    console.log('Calling GTFS');
    displayScheduledTransit();
    intervalID = setInterval(displayScheduledTransit, 600*1000);
  }
}

function getTimeString(){
  var h,m,s;
  var nn = new Date();
  h = String(nn.getHours());
  if (h.length == 1){
    h = '0' + h;
  }
  m = String(nn.getMinutes());
  if (m.length == 1){
    m = '0' + m;
  }
  s = String(nn.getSeconds());
  if (s.length == 1){
    s = '0' + s;
  }
  return h+':'+m+':'+s;
}

var staticGtfsIntevalId;
function displayScheduledTransit(){
  clearVectorSource();
  if(staticGtfsIntevalId){
    clearInterval(staticGtfsIntevalId);
  }
  //gflag = 1;
  var trips={};
  var year, month, day, timeStr;
  var weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  year = String(now.getFullYear());
  month = String(now.getMonth() + 1);
  if (month.length == 1){
    month = '0' + month;
  }
  day = String(now.getDate());
  if (day.length == 1){
    day = '0' + day;
  }
  wd= weekdays[now.getDay()];
  timeStr = getTimeString();
  console.log(year, month, day,timeStr);
  //console.log(now.getDate(), now.toLocaleDateString());
  var callback = function(data, status){
    if (status == "success"){
      vehicles = data;
      console.log(data);
      staticGtfsIntevalId = setInterval(displayVehicles, 1000);
    }
  };
  $.post('getCurrentTransit', {date: year+month+day, time: timeStr, weekday: wd }, callback);
  //now = new Date( now.getTime() + 5*60000);
}

var vmap = {};
function displayVehicles(){
  for(i in vehicles){
    //var callback = function(longi, lati, tid, style, color){
    //    plot(lati,longi,tid, style, color);
    //}
    //getCurrentLocation(vehicles[i], callback);
    getCurrentLocation(vehicles[i], plot);
  };
  var fs = vectorSource.getFeatures();
  vectorSource.clear();
  vectorSource.addFeatures(fs);
}

function getCurrentLocation(vehicle, callback){
  var vstops = vehicle.stops;
  var timeStr = getTimeString();
  //console.log(timeStr, vehicle);
  var i = 0;
  if (vehicle.currLocIdx){
    i = vehicle.currLocIdx;
  }
  for (;i<vstops.length;i++){
    if(vstops[i].ARRIVAL_TIME > timeStr){
      break;
    }
  }
  if(i == 0 || i == vstops.length){
    return;
  }
  vehicle.currLocIdx = i-1;

  var pre = vstops[i-1].ARRIVAL_TIME;
  var next = vstops[i].ARRIVAL_TIME;
  var dhnp = parseInt(next.substring(0,2)) - parseInt(pre.substring(0,2));
  var dmnp = parseInt(next.substring(3,5)) - parseInt(pre.substring(3,5));
  var dtnp = (dhnp * 60 + dmnp) * 60.0 -10.0;
  var dhnc = parseInt(next.substring(0,2)) - parseInt(timeStr.substring(0,2));
  var dmnc = parseInt(next.substring(3,5)) - parseInt(timeStr.substring(3,5));
  var dtnc = (dhnc * 60 + dmnc) * 60.0 - parseInt(timeStr.substring(6,8));
  var ft = dtnp != 0 ? dtnc/ dtnp : 0;
  var curr_lat, curr_lon;
  //console.log(next, timeStr, dtnc, dtnp);
  if (dtnp - dtnc <= 0.0){
    curr_lat = vstops[i-1].STOP_LAT ;
    curr_lon = vstops[i-1].STOP_LON ;
  }else{
    curr_lat = dtnp != 0 ? vstops[i].STOP_LAT - ft * (vstops[i].STOP_LAT - vstops[i-1].STOP_LAT) : vstops[i].STOP_LAT ;
    curr_lon = dtnp != 0 ? vstops[i].STOP_LON - ft * (vstops[i].STOP_LON - vstops[i-1].STOP_LON) : vstops[i].STOP_LON ;
  }
  
  if (isNaN(curr_lon) || !isFinite(curr_lat)){
    return;
  }

  if (routeShapes[vehicle.SHAPE_ID]){
    var curr_point = magic(routeShapes[vehicle.SHAPE_ID], curr_lon, curr_lat);
    //curr_lon = curr_point[0];
    //curr_lat = curr_point[1];
    //console.log(curr_point, curr_lon, curr_lat);
  }
  vmap[vehicle.trip_id] = vehicle;
  callback(curr_lon, curr_lat,vehicle.trip_id, vehicle.ROUTE_LONG_NAME, vehicle.ROUTE_COLOR);
}

function magic(linestring, longi, lati){
  return [longi, lati];
}

function clearVectorSource(){
  vectorSource.clear();
  stopFeatures = [];
  plottedLine = undefined;
  pre_running = {};
  $('#st').dataTable().fnClearTable();
}

var plottedLine;

function plotLine(coordinates){
  if (coordinates){
    if (plottedLine){
      vectorSource.removeFeature(plottedLine);
    }
    plottedLine = new ol.Feature(
        new ol.geom.LineString(coordinates)
        );
    vectorSource.addFeature(plottedLine);
  }
}

function plot(longi, lati, point_id, style, color){
  //console.log(longi, lati, point_id);
  var selected_style = styles['Point'];
  if(style){
    if (styles[style]){
      selected_style = styles[style];
    }else{
      //console.log(style, color);
      var newCircle;
      if(color == '000000'){
        newCircle = new ol.style.Circle({
          radius: 6,
          snapToPixel: false,
          fill: new ol.style.Fill({color: 'black'})
        });
      }else{
        var newColor = '#' + color;
        //console.log(newColor);
        newCircle = new ol.style.Circle({
          radius: 10,
          snapToPixel: false,
          fill: new ol.style.Fill({color: newColor})
        });
      }
      selected_style = new ol.style.Style({
            image: newCircle
          });
    }
  }
  var f = vectorSource.getFeatureById(point_id);
  var point = new ol.geom.Point(ol.proj.transform([longi, lati], 'EPSG:4326', 'EPSG:3857'));
  if (f == null){
    //console.log(point_id);
    f = new ol.Feature(point);
    f.setId(point_id);
    f.setStyle(selected_style);
    if(style == 'Stop'){
      stopFeatures.push(f);
    }
    vectorSource.addFeature(f);
  }else{
    f.setGeometry(point);
  }
}

clickStartCurrentTransit();

