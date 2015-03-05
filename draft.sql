select * from calendar where monday = 1 and start_date < '20141207' and end_date > '20141207';

select trip_id, route_id from trips where service_id in ( 
	select service_id from calendar where monday = 1 and start_date < '20141207' and end_date > '20141207');

select stop_id,trip_id, arrival_time from stop_times where trip_id in ( select trip_id from trips where service_id in ( select service_id from calendar where monday = 1 and start_date < '20141207' and end_date > '20141207')) and arrival_time = '22:27:00';


select stop_id from stop_times where trip_id in ( select trip_id from trips where service_id in ( select service_id from calendar where monday = 1 and start_date < '20141207' and end_date > '20141207')) and arrival_time = '22:27:00' group by trip_id;

select stop_id, stop_lat, stop_lon from stops where stop_id in ( select stop_id from stop_times where trip_id in ( select trip_id from trips where service_id in ( select service_id from calendar where monday = 1 and start_date < '20141207' and end_date > '20141207')) and arrival_time = '22:27:00' group by trip_id );

select s.stop_id, s.stop_lon, s.stop_lat from stops s, (select stop_id from stop_times where trip_id in ( select trip_id from trips where service_id in ( select service_id from calendar where monday = 1 and start_date < '20141207' and end_date > '20141207')) and arrival_time = '22:27:00' group by trip_id ) st where st.stop_id = s.stop_id;

