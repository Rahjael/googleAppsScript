// In Github backup, IDs are omitted for privacy reasons


const CONFIG = {
  CALENDAR_ID: '',

  PRICES_URL: 'https://www.mise.gov.it/images/exportCSV/prezzo_alle_8.csv',
  STATIONS_URL: 'https://www.mise.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv',
  APP_FOLDER_ID: '',
  PRICES_CSV_FILENAME: 'prezzo_alle_8.csv',
  STATIONS_CSV_FILENAME: 'anagrafica_impianti_attivi.csv',
  SHEET_DATABASE_ID: '',
  PRICES_SHEET_NAME: 'Prezzi',
  STATIONS_SHEET_NAME: 'Impianti',
  PRICES_KEYWORD: 'prezzo',
  STATIONS_KEYWORD: 'impianti',
  CSV_DELIMITER: ';',
  MAX_DISTANCE: 20, // km
  MAX_DURATION: 15, // minutes
  PROVINCES: ['AR', 'FI', 'GR', 'LI', 'LU', 'MS', 'PI', 'PT', 'PO', 'SI'],

  GEOCODES: {
    DATABASE_ID: '',
    SHEETNAME: 'geocodes',
    ADDRESS_INDEX: 0,
    LATITUDE_INDEX: 1,
    LONGITUDE_INDEX: 2,
    FORMATTED_ADDRESS_INDEX: 3,
    MAX_PER_SCRIPT_EXECUTION: 2
  }
}


// This is a dirty trick for performance, I will have to fix it later on
// The goal is to avoid traversing the entire stations array for every event.
// The second goal is to get around premium restrictions for geocodes
const TEMP_DATA = {
  TUSCANY_STATIONS: [],
  TUSCANY_STATIONS_LOADED: false,
  GEOCODES_DATABASE: [],
  GEOCODE_CALLS_THIS_EXECUTION: 0
}