
function test() {
  Logger.log(getFormattedTodayEvents());

}


function getFormattedTodayEvents() {
  // Fetch events from Calendar, return array of event objects:
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

  eventsOfToday.forEach(event => {
    Logger.log(event.getLocation());
  });

  const eventsToReturn = eventsOfToday.reduce((eventsContainer, event,) => {
    const location = event.getLocation();

    if(location) {
      const coords = geocoder.geocode(location); // This returns a JSON object
      const latitude = coords.results[0].geometry.location.lat;
      const longitude = coords.results[0].geometry.location.lng;

      eventsContainer = eventsContainer.concat([{
        title: event.getTitle(),
        latitude: latitude,
        longitude: longitude,
        startTime: event.getStartTime(),
        location: location
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
