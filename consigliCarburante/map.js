
function mapTest() {
  const stations = getStationsData();

  const events = getFormattedTodayEvents();

  const testEvents = events.filter(event => {
    return event.title === 'test';
  }).map(event => event.location);

  const distanceValues = getDrivingDistanceAndDuration(testEvents[0], testEvents[1]);

  Logger.log(distanceValues);

  let startPoint = events[1];
  let endPoint = stations[1];

  /*
  Logger.log(startPoint);
  Logger.log(endPoint);

  let address1 = startPoint.location;
  let address2 = gpsToAddress(endPoint.latitude, endPoint.longitude);

  Logger.log(address1);
  Logger.log(address2);

  Logger.log(getDrivingDistanceAndDuration(address1, address2));
  */
}


function gpsToAddress(latitude, longitude) {
  const address = Maps.newGeocoder().reverseGeocode(latitude, longitude).results[0].formatted_address;
  return address;
}


function getDrivingDistanceAndDuration(address1, address2) {
  // Returns an object

  // TODO chain these calls?
  const directionFinder = Maps.newDirectionFinder();
  directionFinder.setOrigin(address1);
  directionFinder.setDestination(address2);
  directionFinder.setMode(Maps.DirectionFinder.Mode.DRIVING);
  
  
  // getDirections() returns a pretty hairy object. Parts that matter here:
  // directions.routes[0].legs[0].distance.value
  // directions.routes[0].legs[0].distance.text
  // directions.routes[0].legs[0].duration.value
  // directions.routes[0].legs[0].duration.text
          /*
          "distance": {
            "value": 1228173,
            "text": "1,228 km"
          },
          "duration": {
            "text": "13 hours 9 mins",
            "value": 47354
          },
          */
  const directions = directionFinder.getDirections();

  /*
  // Debugging info
  Logger.log(directions.routes[0].legs[0].distance.text);
  Logger.log(directions.routes[0].legs[0].distance.value);
  Logger.log(directions.routes[0].legs[0].duration.text);
  Logger.log(directions.routes[0].legs[0].duration.value);
  */

  try {


  return {
    distance: directions.routes[0].legs[0].distance.value,
    duration: directions.routes[0].legs[0].duration.value
  }
  }
  catch(e) {
    Logger.log(address1);
    Logger.log(address2);

    Logger.log(directions.routes)

    throw Error('crashed');
  }
}
