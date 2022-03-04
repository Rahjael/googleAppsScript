function gatherNewGeocodes() {
  // This function is meant to be periodically run to gather addresses from the stations csv
  // and convert them to formatted_addresses as per google's geocode service. This service
  // has premium limits and cannot be invoked too many times in a short time, so the idea
  // is to periodically get some convertions and store them in a sheet for future use.

  const geocodesSheet = SpreadsheetApp.openById(CONFIG.GEOCODES.DATABASE_ID).getSheetByName(CONFIG.GEOCODES.SHEETNAME);
  const geocodesDatabase = geocodesSheet.getRange(2, 1, geocodesSheet.getLastRow(), geocodesSheet.getLastColumn()).getValues();

  // Get all the address who have been already converted, this will be used to skip conversions
  const alreadyProcessedAddresses = geocodesDatabase.map(row => {
    return row[CONFIG.GEOCODES.ADDRESS_INDEX];
  });

  const allStations = getStationsData();
  
  // Check every station. If not in the database, convert address and add it
  for(let i = 0, processedThisTime = 0; processedThisTime < CONFIG.GEOCODES.MAX_PER_SCRIPT_EXECUTION; i++) {
    if(!alreadyProcessedAddresses.includes(allStations[i].indirizzo)) {
      addThisStationToGeocodesDatabase(allStations[i]);
      processedThisTime++;
    }
  }
}


function addThisStationToGeocodesDatabase(station) {
  // Create a spreadsheet row to add to the database

  // Initialise geocoder to reverse coords to Maps formatted address
  const geocoder = Maps.newGeocoder().setLanguage('it').setRegion('it');
  const formatted_address = geocoder.reverseGeocode(station.latitude, station.longitude).results[0].formatted_address;

  // Prepare row
  const row = [station.indirizzo, station.latitude, station.longitude, formatted_address];

  // Append row to database
  const geocodesSheet = SpreadsheetApp.openById(CONFIG.GEOCODES.DATABASE_ID).getSheetByName(CONFIG.GEOCODES.SHEETNAME);
  geocodesSheet.getRange(geocodesSheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}
