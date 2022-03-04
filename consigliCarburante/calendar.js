
function test() {
  

  // Get all stations closer than limits, for every event of the day
  const eventsOfToday = getFormattedTodayEvents();
  const stationsNearby = eventsOfToday.reduce((stations, event) => {
    const stationsNearby = getStationsCloserThan(event.location, CONFIG.MAX_DISTANCE, CONFIG.MAX_DURATION);
    if(stationsNearby.length > 0) {
      return stations.concat(stationsNearby);
    }
    else {
      return stations;
    }
  }, []);

  Logger.log(stationsNearby);

}



function getTuscanyStations() {
  const stations = getStationsData().filter(station => {
    return CONFIG.PROVINCES.some( province => {
      return province === station.provincia;
    });
  });
  Logger.log(`Found ${stations.length} stations in Tuscany`);
  return stations;
}

function getStationsCloserThan(targetAddress, maxDist, maxTime) {
  // maxDist is in km
  // maxTime is in seconds

  if(!TEMP_DATA.TUSCANY_STATIONS_LOADED) {
    TEMP_DATA.TUSCANY_STATIONS = getTuscanyStations();
    TEMP_DATA.TUSCANY_STATIONS_LOADED = true;
  }


  const stations = TEMP_DATA.TUSCANY_STATIONS.filter(station => {
    let stationAddress;
    let separation;
      stationAddress = gpsToAddress(station.latitude, station.longitude);
      separation = getDrivingDistanceAndDuration(targetAddress, stationAddress);
    
    return separation.distance <= maxDist || separation.duration <= maxTime;
  });

  return stations;
}







function getFormattedTodayEvents() {
  // Fetch events from Calendar, return array of event objects:
  // XXX events without address will be ignored
  /*
  {
    title: 
    latitude: 
    longitude: 
    startTime:
    location:
  }
  */
  const today = convertTZ(new Date(), 'Europe/Rome');
  const eventsOfToday = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID).getEventsForDay(today);

  const geocoder = Maps.newGeocoder().setLanguage('it').setRegion('it');
/*
  eventsOfToday.forEach(event => {
    Logger.log(event.getLocation());
  });
*/
  const eventsToReturn = eventsOfToday.reduce((eventsContainer, event,) => {
    const location = event.getLocation();

/*
    Logger.log('Event and location:');
    Logger.log(event.getTitle());
    Logger.log(location);
*/
    if(location) {
      const coords = geocoder.geocode(location); // This returns a JSON object
      const latitude = coords.results[0].geometry.location.lat;
      const longitude = coords.results[0].geometry.location.lng;
      const fixedLocation = geocoder.reverseGeocode(latitude, longitude).results[0].formatted_address;

      /*
      Logger.log(`lat ${latitude}`);
      Logger.log(`lat ${longitude}`);
      Logger.log(`fixedLocation ${fixedLocation}`);
      */

      eventsContainer = eventsContainer.concat([{
        title: event.getTitle(),
        latitude: latitude,
        longitude: longitude,
        startTime: event.getStartTime(),
        location: fixedLocation
      }]);
    }
    return eventsContainer;
}, []);

  return eventsToReturn;
}

























/*
Timezone management as explained here:
https://stackoverflow.com/questions/10087819/convert-date-to-another-timezone-in-javascript

function convertTZ(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
}

// usage: Asia/Jakarta is GMT+7
convertTZ("2012/04/20 10:10:30 +0000", "Asia/Jakarta") // Tue Apr 20 2012 17:10:30 GMT+0700 (Western Indonesia Time)

// Resulting value is regular Date() object
const convertedDate = convertTZ("2012/04/20 10:10:30 +0000", "Asia/Jakarta") 
convertedDate.getHours(); // 17

// Bonus: You can also put Date object to first arg
const date = new Date()
convertTZ(date, "Asia/Jakarta") // current date-time in jakarta.
*/

function convertTZ(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
}
