var mysql = require('mysql'), 
    sys = require('sys');

function getCurrentTransit(date, time, weekday, callback){
    var connection = mysql.createConnection({
      host     : 'localhost',
      user     : 'root',
      password : '63141716',
      database : 'gtfs',
    });
    connection.connect(printErr);
    sys.puts(date, time, weekday);
    var queryString = "select s.stop_id, s.stop_lon, s.stop_lat from stops s, "
                        + "(select stop_id from stop_times where trip_id in "
                            + "( select trip_id from trips where service_id in "
                                + "( select service_id from calendar where "
                                    + weekday +" = 1 and start_date <= '"+ date +"' "
                                    + "and end_date >= '" + date +"')) "
                        + "and arrival_time <= '" + time + "' and departure_time >= '" + time
                        + "' group by trip_id ) st where st.stop_id = s.stop_id;";
    connection.query(queryString, function(err, rows, fields){
        if (err) { sys.puts(err); };
        callback(JSON.stringify(rows));
    })
    connection.end();
}

exports.getCurrentTransit = getCurrentTransit;
