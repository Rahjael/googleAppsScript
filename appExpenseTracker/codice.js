const SPREADSHEET_ID = '-';
const ADMIN_EMAIL = '';

//
//
//
//
//
// PRIVATE INFO AND IDS ABOVE THIS POINT
//
//
//
//
//


//
// CONSTS
//

const SHOULD_LOG_EVERY_EVENT = true;

const CARBURANTE_SHEET_NAME = 'Carburante';
const CARBURANTE_STATS_SHEET_NAME = 'CarburanteStats';

const CARBURANTE_ID_COLUMN = 1;
const CARBURANTE_DATA_COLUMN = 2;
const CARBURANTE_KM_COLUMN = 3;
const CARBURANTE_IMPORTO_COLUMN = 4;
const CARBURANTE_TIPO_COLUMN = 5;

const CARBURANTE_STATS_ID_COLUMN = 1;
const CARBURANTE_STATS_DATA_COLUMN = 2;
const CARBURANTE_STATS_KM_COLUMN = 3;
const CARBURANTE_STATS_IMPORTO_COLUMN = 4;
const CARBURANTE_STATS_TIPO_COLUMN = 5;
const CARBURANTE_STATS_KM_FATTI_COLUMN = 6;
const CARBURANTE_STATS_EURO_KM_COLUMN = 7;
const CARBURANTE_STATS_KM_EURO_COLUMN = 8;


//
// HOOKS
//

const CARBURANTE_SHEET = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CARBURANTE_SHEET_NAME);
const CARBURANTE_STATS_SHEET = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CARBURANTE_STATS_SHEET_NAME);

const CARBURANTE_TABLE = CARBURANTE_SHEET.getRange(1, 1, CARBURANTE_SHEET.getLastRow(), CARBURANTE_SHEET.getLastColumn()).getValues();
const CARBURANTE_STATS_TABLE = CARBURANTE_STATS_SHEET.getRange(1, 1, 1, CARBURANTE_STATS_SHEET.getLastColumn()).getValues();

// Little adapter to log in Apps Scripts interface
// wait a sec, is this useful at all? :/
const console = {
  log: (string) => {Logger.log(string)}
}


//
// SCRIPTS
//


function fuelTrigger(e) {

  const ss = e.source; // Spreadsheet Object
  const activeSheet = ss.getActiveSheet();
  const activeRange = activeSheet.getActiveRange();
  const eventType = e.changeType; // String
  const sheetName = activeSheet.getName(); // String
  /* e.changeType:
  * EDIT
  * INSERT_ROW
  * INSERT_COLUMN
  * REMOVE_ROW
  * REMOVE_COLUMN
  * INSERT_GRID
  * REMOVE_GRID
  * FORMAT
  * OTHER
  */

  if(eventType != 'EDIT') return;
  
  if(SHOULD_LOG_EVERY_EVENT) {
    Logger.log("Sheet name:" + sheetName);
    Logger.log("Event:" + eventType);
    // Logger.log("getRow():" + activeRange.getRow());
    // Logger.log("getColumn():" + activeRange.getColumn());
    // Logger.log("getWidth():" + activeRange.getWidth());
    // Logger.log("getHeight():" + activeRange.getHeight());
    // Logger.log("getA1Notation():" + activeRange.getA1Notation());
  }

  if(eventType === "EDIT" && sheetName === CARBURANTE_SHEET_NAME) {
    updateStats();
  }



}

function updateStats() {
  const startTime = Date.now();

  sortSeedingTable();
  fillStatsTableWithSeedingData();
  fillStatsTableWithKmFatti();
  fillStatsTableWithCostData();

  clearStatsSheet();
  writeToStatsSheet();

  console.log(`Scripts executed in ${Date.now() - startTime} ms`);
}


function logStatsTable() {
  CARBURANTE_STATS_TABLE.forEach( data => console.log(data));
}


function sortSeedingTable() {
  CARBURANTE_TABLE.sort( (obj1, obj2) => obj1[CARBURANTE_KM_COLUMN - 1] - obj2[CARBURANTE_KM_COLUMN - 1] );
}

function fillStatsTableWithSeedingData() {
  // This counter is important to keep the two tables consistent while iterating in the for loop
  let skippedValues = 0;

  for(let i = 1; i < CARBURANTE_TABLE.length; i++) {

    // Skip rows with empty date
    if(CARBURANTE_TABLE[i][CARBURANTE_DATA_COLUMN - 1] === '') {
      skippedValues++;
      continue;
    }

    CARBURANTE_STATS_TABLE.push([...CARBURANTE_TABLE[i]]);
    CARBURANTE_STATS_TABLE[i - skippedValues].push('a');
    CARBURANTE_STATS_TABLE[i - skippedValues].push('a');
    CARBURANTE_STATS_TABLE[i - skippedValues].push('a');
  }
}

function fillStatsTableWithKmFatti() {
  for(let i = 1; i < CARBURANTE_STATS_TABLE.length - 1; i++) {
    const thisKM = CARBURANTE_STATS_TABLE[i][CARBURANTE_STATS_KM_COLUMN - 1];
    const nextKM = CARBURANTE_STATS_TABLE[i + 1][CARBURANTE_STATS_KM_COLUMN - 1];
    CARBURANTE_STATS_TABLE[i][CARBURANTE_STATS_KM_FATTI_COLUMN - 1] = Math.floor(nextKM - thisKM);
  }
}

function fillStatsTableWithCostData() {
  for(let i = 1; i < CARBURANTE_STATS_TABLE.length - 1; i++) {
    const thisKM = CARBURANTE_STATS_TABLE[i][CARBURANTE_STATS_KM_FATTI_COLUMN - 1];
    const thisImporto = CARBURANTE_STATS_TABLE[i][CARBURANTE_STATS_IMPORTO_COLUMN - 1];
    CARBURANTE_STATS_TABLE[i][CARBURANTE_STATS_EURO_KM_COLUMN - 1] = (thisImporto / thisKM).toFixed(2); // toFixed(2): float with 2 decimals
    CARBURANTE_STATS_TABLE[i][CARBURANTE_STATS_KM_EURO_COLUMN - 1] = (thisKM / thisImporto).toFixed(2);
  }
}

function clearStatsSheet() {
  const range = CARBURANTE_STATS_SHEET.getRange(2,1, CARBURANTE_STATS_SHEET.getMaxRows(), CARBURANTE_STATS_SHEET.getMaxColumns());
  range.clearContent();
}


function writeToStatsSheet() {
  CARBURANTE_STATS_SHEET.getRange(1, 1, CARBURANTE_STATS_TABLE.length, CARBURANTE_STATS_TABLE[0].length).setValues(CARBURANTE_STATS_TABLE);
}



