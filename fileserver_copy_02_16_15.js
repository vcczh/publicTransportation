var sys = require("sys"),  
my_http = require("http"),  
path = require("path"),  
url = require("url"),  
filesys = require("fs");


var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

function printErr(err){
    if (err) {
        sys.puts(err);
    }
}

function getCurrentTransit(date, time, weekday, callback){
    
    sys.puts(date, time, weekday);
    var queryString  =  "select st.trip_id, st.ARRIVAL_TIME, st.STOP_ID, st.STOP_HEADSIGN, st.STOP_SEQUENCE, s.STOP_NAME, s.STOP_LAT, s.STOP_LON, t.ROUTE_ID, t.SERVICE_ID, t.SHAPE_ID, r.ROUTE_SHORT_NAME, r.ROUTE_LONG_NAME, r.ROUTE_COLOR "
                        + "from stop_times st, stops s, trips t, routes r "
                        + "where st.trip_id in ( "
                            + "select trip_id "
                            + "from stop_times " 
                            + "where trip_id in ( select trip_id "
                                                + "from trips "
                                                + "where service_id in ( select service_id "
                                                                        + "from calendar "
                                                                        + "where " + weekday + " = 1 )) "
                                + "and arrival_time <= '" + time + "' "
                            + " INTERSECT "
                            + " select trip_id "
                            + "from stop_times "
                            + "where trip_id in ( select trip_id "
                                                + "from trips "
                                                + "where service_id in ( select service_id "
                                                                        + "from calendar "
                                                                        + "where " + weekday + " = 1 )) "
                            + "and departure_time >= '" + time + "' "

                        + ") "
                        + "and st.stop_id = s.stop_id and st.trip_id = t.trip_id and t.route_id = r.route_id";

    sys.puts(queryString);

    oracledb.getConnection(
      {
        user          : dbConfig.user,
        password      : dbConfig.password,
        connectString : dbConfig.connectString
      },
      function(err, connection)
      {
        if (err) {
          console.error(err.message);
          return;
        };

        connection.execute(
          queryString,
          {},
          {maxRows: 100000},
          function(err, result)
          {
            if (err) {
              console.error(err.message);
              return;
            }
            console.log(result.rows.length);
            callback(JSON.stringify( parseResult(result.rows) ) );
          });
      });

}

function parseResult(rows){
    var map = {};
    var json = [];
    var curr = {}, temp = {};
    var len = 0;
    for(i in rows){
        var row = rows[i];
        if (len == 0){
            curr['trip_id'] = row[0];
            curr['STOP_HEADSIGN'] = row[3];
            curr['ROUTE_ID'] = row[8];
            curr['SERVICE_ID'] = row[9];
            curr['SHAPE_ID'] = row[10];
            curr['ROUTE_SHORT_NAME'] = row[11];
            curr['ROUTE_LONG_NAME'] = row[12];
            curr['ROUTE_COLOR'] = row[13];
            curr['stops'] = [];
            temp['STOP_ID'] = row[2];
            temp['ARRIVAL_TIME'] = row[1];
            temp['STOP_SEQUENCE'] = row[4];
            temp['STOP_NAME'] = row[5];
            temp['STOP_LAT'] = row[6];
            temp['STOP_LON'] = row[7];
            curr['stops'].push(temp);
        }else{
            if( row[0] == curr['trip_id']){
                temp = {};
                temp['STOP_ID'] = row[2];
                temp['ARRIVAL_TIME'] = row[1];
                temp['STOP_SEQUENCE'] = row[4];
                temp['STOP_NAME'] = row[5];
                temp['STOP_LAT'] = row[6];
                temp['STOP_LON'] = row[7];
                curr['stops'].push(temp);
            }else{
                if (map[curr['trip_id']] != undefined ){
                    var preLoc = map[curr['trip_id']];
                    if( curr['stops'][0].STOP_SEQUENCE < json[preLoc]['stops'][0].STOP_SEQUENCE){
                        var i =curr['stops'].length-1;
                        while(i>=0){
                            json[preLoc]['stops'].unshift( curr['stops'][i]);
                            i--;
                        }
                    }else{
                        for( i in curr['stops']){
                            json[preLoc]['stops'].push(curr['stops'][i]);
                        }
                    }
                }else{
                    json.push(curr);
                    map[curr['trip_id']] = json.length-1;
                }
                curr = {};
                temp = {};
                curr['trip_id'] = row[0];
                curr['STOP_HEADSIGN'] = row[3];
                curr['ROUTE_ID'] = row[8];
                curr['SERVICE_ID'] = row[9];
                curr['SHAPE_ID'] = row[10];
                curr['ROUTE_SHORT_NAME'] = row[11];
                curr['ROUTE_LONG_NAME'] = row[12];
                curr['ROUTE_COLOR'] = row[13];
                curr['stops'] = [];
                temp['STOP_ID'] = row[2];
                temp['ARRIVAL_TIME'] = row[1];
                temp['STOP_SEQUENCE'] = row[4];
                temp['STOP_NAME'] = row[5];
                temp['STOP_LAT'] = row[6];
                temp['STOP_LON'] = row[7];
                curr['stops'].push(temp);
            }
        }
        len += 1;
    }
    if (map[curr['trip_id']] != undefined ){
        var preLoc = map[curr['trip_id']];
        if( curr['stops'][0].STOP_SEQUENCE < json[preLoc]['stops'][0].STOP_SEQUENCE){
            var i =curr['stops'].length-1;
            while(i>=0){
                json[preLoc]['stops'].unshift( curr['stops'][i]);
                i--;
            }
        }else{
            for( i in curr['stops']){
                json[preLoc]['stops'].push(curr['stops'][i]);
            }
        }
    }else{
        json.push(curr);
        map[curr['trip_id']] = json.length-1;
    }
    console.log(json.length);
    return json;
}


my_http.createServer(function(request,response){
    var my_path = url.parse(request.url).pathname; 
    //console.log(my_path);
    if (request.method == 'POST'){
        var body='';
        request.on('data', function(data){
            body += data;
            if (body.length > 1e3){
                request.connection.destroy();
            }
        });
        request.on('end', function(){
            var post = require('querystring').parse(body);
            if (my_path.indexOf("getCurrentTransit") > -1){
                getCurrentTransit(post['date'], post['time'], post['weekday'], function(json){
                    sys.puts('return: ' + json.length);
                    sys.puts(json);
                    sys.puts('Query on ' + post['date'] +" " + post['time'] +" "+ post['weekday'] + " Completed");
                    response.writeHeader(200, {'Content-Type': 'application/json'});   
                    response.write(json); 
                    response.end(); 
                    //response.end(json);
                });    
            }
            
        });
    }else{
        var full_path = path.join(process.cwd(),my_path);  
        console.log(full_path);
        filesys.exists(full_path,function(exists){  
            if(!exists){  
                response.writeHeader(404, {"Content-Type": "text/plain"});    
                response.write("404 Not Found\n");    
                response.end();  
            }  
            else{  
                filesys.readFile(full_path, "binary", function(err, file) {    
                     if(err) {    
                         response.writeHeader(500, {"Content-Type": "text/plain"});    
                         response.write(err + "\n");    
                         response.end();    
                     }    
                     else{  
                        response.writeHeader(200);    
                        response.write(file, "binary");    
                        response.end();  
                    }  
                           
                });  
            }  
        });         
    }
     
}).listen(11572);  
sys.puts("Server Running on 11572");      