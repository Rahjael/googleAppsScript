function performDailyRoutine() {
  downloadOpenDataCSVsToDrive();
  updateStationsDatabase();
  updatePricesDatabase();
  Logger.log('Daily routine correctly performed.');
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

  // Get how many digits the integer part has
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

function updateStationsDatabase() {
  const startTime = Date.now();
  // Get CSV data as a string from the file, and turn it into a js 2d array
  const stringData = DriveApp.getFolderById(CONFIG.APP_FOLDER_ID).getFilesByName(CONFIG.STATIONS_CSV_FILENAME).next().getBlob().getDataAsString();
  const data = parseCSVStringDataTo2dArray(stringData); // 2d array


  // Replace dot with comma in latitude and longitude to prevent SpreadsheetApp problems when pasting value
  data.forEach( (row,i) => {
    if(i === 0) return;
    row[8] = parseLatLong(row[8]).replace('.', ','); // latitude
    row[9] = parseLatLong(row[9]).replace('.', ','); // longitude
  });

  // Paste data to the proper datasheet, after clearing it
  const stationsSheet = SpreadsheetApp.openById(CONFIG.SHEET_DATABASE_ID).getSheetByName(CONFIG.STATIONS_SHEET_NAME);
  stationsSheet.clearContents();
  const rangeToPasteIn = stationsSheet.getRange(1, 1, data.length, data[0].length);
  rangeToPasteIn.setValues(data);
  Logger.log(`Contents of file ${CONFIG.STATIONS_CSV_FILENAME} have been copied to the database (${Date.now() - startTime} ms)`);
}


function updatePricesDatabase() {
  const startTime = Date.now();
  // Get CSV data as a string from the file, and turn it into a js 2d array
  const stringData = DriveApp.getFolderById(CONFIG.APP_FOLDER_ID).getFilesByName(CONFIG.PRICES_CSV_FILENAME).next().getBlob().getDataAsString();
  const data = parseCSVStringDataTo2dArray(stringData); // 2d array

  // Add a UNIQUEID for every record
  data.forEach( (row, i) => {
    if(i === 0) {
      row.unshift('idPrezzo');
    } else {
      row.unshift(generateUID());
    }
  });

  // Replace dot with comma in prices to prevent SpreadsheetApp problems when pasting value
  data.forEach( (row, i) => {
    if(i === 0) return;
    row[3] = row[3].replace('.', ','); // prices
  });

/*
  for(let i = 0; i < 100; i++) {
    Logger.log(data[i]);
  }
  return;
*/
  // Paste data to the proper datasheet, after clearing it
  const pricesSheet = SpreadsheetApp.openById(CONFIG.SHEET_DATABASE_ID).getSheetByName(CONFIG.PRICES_SHEET_NAME);
  pricesSheet.clearContents();
  const rangeToPasteIn = pricesSheet.getRange(1, 1, data.length, data[0].length);
  rangeToPasteIn.setValues(data);
  Logger.log(`Contents of file ${CONFIG.PRICES_CSV_FILENAME} have been copied to the database. (${Date.now() - startTime} ms)`);
}

function downloadOpenDataCSVsToDrive() {
  // Cleanup already existing versions...
  // TODO this part assumes the following download will be alright.
  // The potential risk is to delete the files without being able to get new ones. FIX THIS
  [CONFIG.PRICES_CSV_FILENAME, CONFIG.STATIONS_CSV_FILENAME].forEach( filename => {
    const iterator = DriveApp.getFolderById(CONFIG.APP_FOLDER_ID).getFilesByName(filename);
    while(iterator.hasNext()) {
      let file = iterator.next();
      file.setTrashed(true);
    }
  });
  Logger.log(`Old OpenData files deleted`);

  // ... then download new versions
  [CONFIG.PRICES_URL, CONFIG.STATIONS_URL].forEach( url => {
    // This returns an HTTPResponse object
    const response = UrlFetchApp.fetch(url);

    // If response is good, make it a blob and create a file
    if(response.getResponseCode() === 200) {
      const fileBlob = response.getBlob();
      const appFolder = DriveApp.getFolderById(CONFIG.APP_FOLDER_ID);
      appFolder.createFile(fileBlob);
      Logger.log(`${fileBlob.getName()} of type ${fileBlob.getContentType()} created in app folder.`);
    }
    else {
      Logger.log(`Something went wrong while fetching resource at ${url}`);
    }
  });
}