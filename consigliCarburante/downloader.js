function performDailyRoutine() {
  downloadOpenDataCSVsToDrive();
  //updateStationsDatabase();
  //updatePricesDatabase();
  //Logger.log('Daily routine correctly performed.');
}

function downloadOpenDataCSVsToDrive() {
  downloadPricesCSV();
  downloadStationsCSV();
}

function generateUID() {
  // Helper function to generate a UNIQUEID the same way appsheet does
  let values = '0123456789abcdefghijklmnopqrstuvwxyz';
  let UID = '';
  for(let i = 0; i < 8; i++) {
    UID += values.charAt(Math.floor(Math.random() * values.length));
  }
  return UID;
}

function parseCSVStringDataTo2dArray(stringData) {
  const rows = stringData.split('\n');
  const data = rows.map( row => {
    return row.split(CONFIG.CSV_DELIMITER);
  });

  // We need to remove the first line because it's just a Date annotation
  data.shift();
  // Sometimes we get an empty last line, so we make sure to get rid of it
  if(data[data.length - 1].length != data[0].length) {
    data.pop();
    Logger.log(`Popped last data row because of length inconsistency`);
  }

  // Check for inconsistencies
  const normalLength = data[1].length;
  data.forEach((row,i) => {
    if(row.length != normalLength) {
      throw Error(`Wrong number of lines in row ${i}. It should be ${normalLength} and it is ${row.length}`);
    }
  });
  return data;
}

function parseLatLong(stringData) {
  // OpenData file has a number formatted like this: "dd.dddddddddddddddddddd"
  // I haven't yet understood why, but here we try and make it better.

  if(typeof stringData != 'string') throw Error('data is not a string');

  // Sanitize spaces before proceeding. Many records have spaces in front...
  stringData = stringData.replace(' ', '');

  // Get how many digits the integer part has and return the parsed value
  const indexOfSeparator = stringData.indexOf('.');
  if(indexOfSeparator === 1) {
    return stringData.slice(0, 7);
  }
  else if(indexOfSeparator === 2) {
    return stringData.slice(0, 8);
  }
  else {
    Logger.log(`An error has occured while parsing value for latitude or longitude: ${stringData}. Returning value as it is.`);
    return stringData;
  }
}



function getStationsData() {
  const startTime = Date.now();
  // Get CSV data as a string from the file, and turn it into a js 2d array
  const stringData = DriveApp.getFolderById(CONFIG.APP_FOLDER_ID).getFilesByName(CONFIG.STATIONS_CSV_FILENAME).next().getBlob().getDataAsString();
  const data = parseCSVStringDataTo2dArray(stringData); // 2d array
  return data;
}

function getPricesData() {
  const startTime = Date.now();
  // Get CSV data as a string from the file, and turn it into a js 2d array
  const stringData = DriveApp.getFolderById(CONFIG.APP_FOLDER_ID).getFilesByName(CONFIG.PRICES_CSV_FILENAME).next().getBlob().getDataAsString();
  const data = parseCSVStringDataTo2dArray(stringData); // 2d array

  // Replace yes/no value to make it more easily understandable to AppSheet
  data.forEach( row => {
    if(row[4] == 1) {
      row[4] = true;
    }
    else if(row[4] == 0) {
      row[4] = false;
    }
  });

  return data;
}


function downloadPricesCSV() {
  const url = CONFIG.PRICES_URL;
  const filename = CONFIG.PRICES_CSV_FILENAME;
  const foldername = CONFIG.APP_FOLDER_ID;
  // This returns an HTTPResponse object
  const response = UrlFetchApp.fetch(url);

  // If response is good
  if(response.getResponseCode() === 200) {
    // Delete old file
    const iterator = DriveApp.getFolderById(foldername).getFilesByName(filename);
    while(iterator.hasNext()) {
      let file = iterator.next();
      file.setTrashed(true);
    }
    // Create new file
    const fileBlob = response.getBlob();
    const appFolder = DriveApp.getFolderById(foldername);
    appFolder.createFile(fileBlob);
    Logger.log(`${fileBlob.getName()} of type ${fileBlob.getContentType()} created in app folder.`);
  }
  else {
    Logger.log(`Something went wrong while fetching resource at ${url}. Old file has not been deleted.`);
  }
}

function downloadStationsCSV() {
  const url = CONFIG.STATIONS_URL;
  const filename = CONFIG.STATIONS_CSV_FILENAME;
  const foldername = CONFIG.APP_FOLDER_ID;
  // This returns an HTTPResponse object
  const response = UrlFetchApp.fetch(url);

  // If response is good
  if(response.getResponseCode() === 200) {
    // Delete old file
    const iterator = DriveApp.getFolderById(foldername).getFilesByName(filename);
    while(iterator.hasNext()) {
      let file = iterator.next();
      file.setTrashed(true);
    }
    // Create new file
    const fileBlob = response.getBlob();
    const appFolder = DriveApp.getFolderById(foldername);
    appFolder.createFile(fileBlob);
    Logger.log(`${fileBlob.getName()} of type ${fileBlob.getContentType()} created in app folder.`);
  }
  else {
    Logger.log(`Something went wrong while fetching resource at ${url}. Old file has not been deleted.`);
  }
}

