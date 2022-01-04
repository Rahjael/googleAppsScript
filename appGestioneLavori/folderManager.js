const GESTIONE_LAVORI_SPREADSHEET_ID = '';
const LAVORI_IN_CORSO_FOLDER_ID = '';
const TO_BE_INVOICED_FOLDER_ID = '';
const TO_BE_ARCHIVED_FOLDER_ID = '';


const ADMIN_EMAIL = '';
const MAIN_AGENT_EMAIL = '';
const NOTIFICATION_ADDRESSES = [ADMIN_EMAIL, MAIN_AGENT_EMAIL];


const PRIVATE_INFO = [GESTIONE_LAVORI_SPREADSHEET_ID, LAVORI_IN_CORSO_FOLDER_ID, TO_BE_INVOICED_FOLDER_ID, TO_BE_ARCHIVED_FOLDER_ID, ADMIN_EMAIL, MAIN_AGENT_EMAIL, NOTIFICATION_ADDRESSES];

//
//
//
//
//
//
//
//
// PRIVATE ACCOUNT INFO ONLY ABOVE THIS POINT
//
//
//
//
//
//
//
//

// DISCLAIMER:
// Variable names contain mixed Italian and English words.
// While I usually despise this kind of unsightly mess,
// it is here somewhat of a forced choice due to how the 
// underlying database (which is a spreadsheet) is built.
//
// I decided to value consistency over naming style. As ugly
// as it is, I find it easier to visualize a connection 
// between what the code does and the parts of the 
// spreadsheet that are affected.

if(PRIVATE_INFO.some( data => data === '' || data === undefined)) {
  throw Error('Did you forget to fill in private info?');
}



//
// Debugging config
//
const TRIGGER_SHOULD_BE_ACTIVE = true; // Affects entire script
const SHOULD_LOG_EVERY_EVENT = true;

const SHOULD_AUTOCREATE_FOLDERS = true; // Automatically create folders in Drive if no ID is found
const SHOULD_AUTOEDIT_FOLDERS = true; // Automatically rename folders with found ID but different name
const SHOULD_CHECK_LAVORI_SHEET_EDITS = true; // Currently not in use
const SHOULD_CHECK_CLIENTI_SHEET_EDITS = true; // Currently not in use
const SHOULD_CHECK_LOG_SHEET_EDITS = true; // Currently not in use


//
// Constants used in many occasions
//


// This is useful for when I need to traverse the entire folder tree
// If constant folders are modified in the future I can just change
// this array and the code shouldn't break
const RELEVANT_FOLDERS_IDS = [
  LAVORI_IN_CORSO_FOLDER_ID,
  TO_BE_INVOICED_FOLDER_ID,
  TO_BE_ARCHIVED_FOLDER_ID
];


const LAVORI_SHEET_NAME = "LAVORI";
const CLIENTI_SHEET_NAME = "CLIENTI";
const LOGS_SHEET_NAME = "LOG";
const RELATED_FILES_SHEET_NAME = "FILE COLLEGATI";

const TO_BE_ARCHIVED_FOLDER_NAME = "AAAAA DA ARCHIVIARE";
const TO_BE_INVOICED_FOLDER_NAME = "AAAAA DA FATTURARE";

const CLIENTI_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(CLIENTI_SHEET_NAME);
const LAVORI_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(LAVORI_SHEET_NAME);
const LOGS_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(LOGS_SHEET_NAME);
const RELATED_FILES_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(RELATED_FILES_SHEET_NAME);
const TEST_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName('TEST');

const CLIENTI_TABLE = CLIENTI_SHEET.getRange(1, 1, CLIENTI_SHEET.getLastRow(), CLIENTI_SHEET.getLastColumn()).getValues();
const LAVORI_TABLE = LAVORI_SHEET.getRange(1, 1, LAVORI_SHEET.getLastRow(), LAVORI_SHEET.getLastColumn()).getValues();
const LOGS_TABLE = LOGS_SHEET.getRange(1, 1, LOGS_SHEET.getLastRow(), LOGS_SHEET.getLastColumn()).getValues();
const RELATED_FILES_TABLE = RELATED_FILES_SHEET.getRange(1, 1, RELATED_FILES_SHEET.getLastRow(), RELATED_FILES_SHEET.getLastColumn()).getValues();

// Consider the following:
// All calls to the actual Drive files and folders should be moved in the above consts section,
// UNLESS they are used only once in nested and specific situations.
// Calls to the Drive can be very costly: rather than
// call a sheet multiple times for smaller intervals, it is
// far more efficient to get all the values in one bigger query.
// Working with the copy of the spreadsheet WITHIN Javascript 
// yields much better performances


// These HAVE TO match column numbers in the spreadsheet
// Remember: SpreadSheetApp counts from 1
const LAVORI_ID_COLUMN = 1;
const LAVORI_REF_TO_CLIENTE_COLUMN = 2;
const LAVORI_RIFERIMENTO_COLUMN = 3;
const LAVORI_STATO_COLUMN = 4;
const LAVORI_NOTE_LAVORO_COLUMN = 5;
const LAVORI_AGENTE_COLUMN = 7;

const CLIENTI_ID_COLUMN = 1;
const CLIENTI_NOME_COLUMN = 2;

const LOG_ID_COLUMN = 1;
const LOG_REF_TO_LAVORI_COLUMN = 2;

const RELATED_FILES_REF_TO_LAVORI_COLUMN = 2;


function test() {
  const address = ADMIN_EMAIL;
  const message = 'test message';

  sendEmailTo(address, message);
}


function sendEmailToCula(lavoroObject) {
  const address = MAIN_AGENT_EMAIL;
  const subject = 'Notifica archiviazione lavoro';
  const lavoroName = getWhatFolderNameShouldBeForThisLavoro(lavoroObject.row);

  const message = `Un lavoro gestito da te è stato contrassegnato come "Da Archiviare" e verrà presto archiviato: 
  
    ${lavoroName}`;

  MailApp.sendEmail(address, subject, message);

  Logger.log(`Email sent to ${address}`);
}


function sendEmailTo(addresses, message) {
  const subject = 'Notifica da Duale App Gestione Lavori';
  MailApp.sendEmail(addresses, subject, message);
  Logger.log(`Email sent to ${addresses}`);
}


function checkClientiDuplicates() {
  let results = {
    exactDuplicates: []
  }

  for(let i = 0; i < CLIENTI_TABLE.length; i++) {
    let name = CLIENTI_TABLE[i][CLIENTI_NOME_COLUMN - 1].toLowerCase();

    for(let j = 0; j < CLIENTI_TABLE.length; j++) {
      if(i != j && name != '') {
        let match = CLIENTI_TABLE[j][CLIENTI_NOME_COLUMN - 1].toLowerCase();
        if(match === name) {
          results.exactDuplicates.push(`${CLIENTI_TABLE[i][CLIENTI_ID_COLUMN - 1]} - ${CLIENTI_TABLE[i][CLIENTI_NOME_COLUMN - 1]}`);
          //results.exactDuplicates.push(`${CLIENTI_TABLE[j][CLIENTI_ID_COLUMN - 1]} - ${CLIENTI_TABLE[j][CLIENTI_NOME_COLUMN - 1]}`);
        }
      }
    }
  }

  if(results.exactDuplicates.length > 0) {
    const duplicatesFoundMessage = `Exact duplicates found: \n\t${results.exactDuplicates.reduce( (acc, current) => acc + '\n\t' + current)}`;

    sendEmailTo(NOTIFICATION_ADDRESSES.join(', '), duplicatesFoundMessage);
  }
}

function deleteEmptyRowsFromEverySheet() {
  const started = Date.now();

  const sheets = [LAVORI_SHEET, CLIENTI_SHEET, LOGS_SHEET]; // Calls to the Drive have already been made

  //const sheets = [TEST_SHEET];

  const isRowEmpty = (rowNum, sheet) => {
    if(sheet.getRange(rowNum, 1).getValue() === '') {
      return true;
    }
    return false;
  }

  let removedRows = 0;

  //
  // OLD VERSION
  //
  /*
  sheets.forEach( sheet => {
    let bottomestEmptyRow = undefined;
    for(let i = sheet.getMaxRows(); i >= 1; i--) {
      if(isRowEmpty(i, sheet) && bottomestEmptyRow === undefined) {
        bottomestEmptyRow = i;
        continue;
      }
      else if(isRowEmpty(i, sheet)) {
        continue;
      }
      else if(bottomestEmptyRow != undefined && !isRowEmpty(i, sheet)) {
        removedRows += bottomestEmptyRow - i;
        sheet.deleteRows(i + 1, bottomestEmptyRow - i);
        bottomestEmptyRow = undefined;
        continue;
      }
    }
  });
  */


  //
  // NEW VERSION
  // 
  sheets.forEach( sheet => {
    let containsEmptyRows = true;
    let currentColumnA;

    while(containsEmptyRows) {
      containsEmptyRows = false;
      let startAt;
      let howMany = 0;

      currentColumnA = sheet.getRange(1, 1, sheet.getMaxRows(), 1).getValues(); // This is a 2d array[rows][columns]

      for(let i = 0; i < currentColumnA.length; i++) {
        if(currentColumnA[i][0] === '') {
          // If cell is empty, get if it's a starting interval
          // else continue checking
          if(startAt === undefined) {
            containsEmptyRows = true;
            startAt = i + 1;
            howMany++;
          }
          else {
            howMany++;
            continue;
          }
        }
        else{
          if(startAt != undefined) {
            break;
          }
        }
      }
      
      if(howMany != 0) {
        removedRows += howMany;
        // Logger.log(`attempting to delete ${startAt}, ${howMany}`);
        sheet.deleteRows(startAt, howMany);
        Logger.log(`Removed ${removedRows} rows in ${Date.now() - started} ms from script start`);
      }
    }
  });

  Logger.log(`Empty rows cleanup done in ${Date.now() - started} ms`);


  // I use a throw to log this process. The reason is appSheet automatically sends me an email
  // whenever anything throws...
  // it's dirty, but far cheaper than writing an actual emailing function for the same result.
  // const logMessage = `Cleanup complete`;
  // throw Error(logMessage);
}


function createLogFileForThisLavoro(lavoroRef) {
  const folders = getAllFoldersWithRef(lavoroRef);
  if(folders.length != 1) {
    throw Error(`There was a problem fetching folders for this lavoro (${lavoroRef}). Number of folders is != 1`);
  }

  const lavoroFolder = folders[0];

  // Get first row of table for columns' names, then log every log for this lavoro
  let logRows = LOGS_TABLE.filter( (row, i) => {
    if(i === 0 || row[LOG_REF_TO_LAVORI_COLUMN - 1] === lavoroRef) {
      return true;
    }
  });

  // Get this lavoroRow
  const lavoroRow = LAVORI_TABLE.filter( row => {
    // Logger.log(`Consistency check: ${lavoroRef}, ${row[LAVORI_ID_COLUMN - 1]}, ${lavoroRef === row[LAVORI_ID_COLUMN - 1]}`);
    return row[LAVORI_ID_COLUMN - 1] === lavoroRef ? true : false;
  });
  // Consistency checks
  if(lavoroRow.length === 0) {
    throw Error(`createLogFileForThisLavoro() returned an empty array for this lavoro: ${lavoroRef}.
    
    NO LOG FILE HAS BEEN CREATED`);
  }
  if(lavoroRow.length > 1) {
    throw Error(`createLogFileForThisLavoro() returned an array with more than 1 record for this lavoro: ${lavoroRef}.
    
    NO LOG FILE HAS BEEN CREATED`);
  }

  // Log "Note Lavoro" as a last row of this log file
  // row is formatted with 4 columns as the other logs:
  const noteLavoroRow = ['Note lavoro: ', lavoroRow[0][LAVORI_NOTE_LAVORO_COLUMN - 1], '', ''];
  const agenteLavoroRow = ['Agente: ', lavoroRow[0][LAVORI_AGENTE_COLUMN - 1], '', ''];
  logRows.push(noteLavoroRow, agenteLavoroRow);

  let dateString = Date().substring(0, 24);
  // IMPORTANT:
  // this next line only works if you enable the Drive API service in the script editor.
  // Ways to do this may vary in time with the evolution of the APIs, check docs
  let newSheet = Drive.Files.insert({mimeType: MimeType.GOOGLE_SHEETS, title: `Logs_${dateString}`, parents: [{id: lavoroFolder.getId()}]});

  // Push values into the newly created sheet
  SpreadsheetApp.openById(newSheet.getId()).getActiveSheet().getRange(1, 1, logRows.length, logRows[0].length).setValues(logRows);

  Logger.log("Log file created");
}


function getStatoOfThisLavoro(rowOrRef) {
  // returns only THE FIRST match
  if(rowOrRef === '') {
    throw Error("input for getStatoOfThisLavoro() was an empty string");
  }
  else if(typeof rowOrRef === 'number') {
    return LAVORI_TABLE[rowOrRef - 2][LAVORI_STATO_COLUMN - 1];
  }
  else if(typeof rowOrRef === 'string') {
    for(let i = 0; i < LAVORI_TABLE.length; i++) {
      if(LAVORI_TABLE[i][LAVORI_ID_COLUMN - 1] === rowOrRef) {
        return LAVORI_TABLE[i][LAVORI_ID_COLUMN - 1];
      }
    }
  }
  else {
    throw Error(`Unable to find a matching lavoro while getStatoOfThisLavoro(): ${rowOrRef}`);
  }
}

function getNomeClienteFromRef(ref) {
  // returns only THE FIRST match

  // ref is a string of 8 chars given by UNIQUEID() in Appsheet
  if(typeof ref != 'string' || ref.length != 8) {
    throw Error('Invalid ref given to getNomeClienteFromRef()');
  }
  for(let i = 0; i < CLIENTI_TABLE.length; i++) {
    if(CLIENTI_TABLE[i][CLIENTI_ID_COLUMN - 1] === ref) {
      return CLIENTI_TABLE[i][CLIENTI_NOME_COLUMN - 1];
    }
  }
  throw Error(`getNomeClienteFromRef() was called but no cliente was found. Ref: ${ref}`);
}


function getLavoriRowsWithThisClienteRef(clienteRef) {
  // returns an array of integers that are row numbers in table LAVORI
  if(clienteRef === '') {
    throw Error('Attempted to find lavoro with empty clienteRef field');
  }
  let lavoriRows = [];
  LAVORI_TABLE.forEach( (row,i) => {
    if(row[LAVORI_REF_TO_CLIENTE_COLUMN - 1] === clienteRef) {
      lavoriRows.push(i + 1);
    }
  });
  return lavoriRows;
}


function getLavoroRowWithThisRef(lavoroRef) {
  if(lavoroRef === '') {
    throw Error('Attempted to find lavoro with empty ref field');
  }
  let lavoroRow;
  LAVORI_TABLE.forEach( (row,i) => {
    if(row[LAVORI_ID_COLUMN - 1] === lavoroRef) {
      lavoroRow = i + 1;
    }
  });
  return lavoroRow;
}


function getWhatFolderNameShouldBeForThisLavoro(row) {
  // Get string values from various places
  const RIFERIMENTO = LAVORI_TABLE[row - 1][LAVORI_RIFERIMENTO_COLUMN - 1];
  const NOME_CLIENTE = getNomeClienteFromRef(LAVORI_TABLE[row - 1][LAVORI_REF_TO_CLIENTE_COLUMN - 1]);
  const LAVORO_ID = LAVORI_TABLE[row - 1][LAVORI_ID_COLUMN -1];

  // CAREFUL! [LAVORO_ID] has 5 whitespaces before [
  // Underscores were too intrusive when printing list
  let name = `${NOME_CLIENTE} - ${RIFERIMENTO}      [${LAVORO_ID}]`;

  //Logger.log("Name should be: " + name);
  return name;
}



function countFoldersContainingThisId(id) {
  if(id.length != 8 && typeof id != 'string') {
    throw Error(`${id} is not a valid argument.`);
  }

  let count = 0;
  RELEVANT_FOLDERS_IDS.forEach( folderId => {
    let folders = DriveApp.getFolderById(folderId).getFolders();
    while(folders.hasNext()) {
      let folder = folders.next();
      if(folder.getName().includes(id)) {
        count++;
      }
    }
  });
  
  return count;
}


function checkFoldersAndIDs() {
  // This function checks that every id has a corresponding folder whose name contains that ID
  // IT DOESN'T CHECK if the rest of the name is how it should be. Here we just need to make sure
  // that the "hooks" used by the app are in a good state.
  let folderNames = [];

  // Check LAVORI_IN_CORSO
  let folders = DriveApp.getFolderById(LAVORI_IN_CORSO_FOLDER_ID).getFolders();
  while(folders.hasNext()) {
    const folderName = folders.next().getName();
    if([TO_BE_INVOICED_FOLDER_NAME, TO_BE_ARCHIVED_FOLDER_NAME].some( name => name === folderName)) {
      continue;
    }
    folderNames.push(folderName);
  }

  // Check TO_BE_ARCHIVED
  folders = DriveApp.getFolderById(TO_BE_ARCHIVED_FOLDER_ID).getFolders();
  while(folders.hasNext()) {
    const folderName = folders.next().getName();
    folderNames.push(folderName);
  }

  // Check TO_BE_INVOICED
  folders = DriveApp.getFolderById(TO_BE_INVOICED_FOLDER_ID).getFolders();
  while(folders.hasNext()) {
    const folderName = folders.next().getName();
    folderNames.push(folderName);
  }

  let IDs = [];
  LAVORI_TABLE.forEach( (row, i) => { // i === 0 is skipped because it's the title row
    if(row[LAVORI_ID_COLUMN - 1] != '' && i != 0) IDs.push(row[0]);
  });


  let results = {
    foundFolderNames: [],
    foundIds: [],
    orphanFolderNames: [],
    orphanIDs: [],
    IDWithMultipleFolders: [],
    duplicateFolders: []
  }

  // Check there is only one folder for each ID
  for(let i = 0; i < IDs.length; i++) {
    let folderNamesWithThisId = [];
    for(let j = 0; j < folderNames.length; j++) {
      if(folderNames[j].includes(IDs[i])) {
        //Logger.log("Foldername " + folderNames[j] + " includes " + IDs[i])
        folderNamesWithThisId.push(j);
      }
    }
    // If only one folder has been found, we can remove it from the checklist
    // and add it to the found ones
    if(folderNamesWithThisId.length === 1) {
      //Logger.log("Removing name: " + folderNames[folderNamesWithThisId[0]]);
      results.foundFolderNames.push(folderNames.splice(folderNamesWithThisId[0], 1)[0]);
      results.foundIds.push(IDs[i]);
    }
    else if(folderNamesWithThisId.length === 0) {
      results.orphanIDs.push(IDs[i]);
    }
    else {
      results.IDWithMultipleFolders.push(i);
      folderNamesWithThisId.forEach( name => {
        results.duplicateFolders.push(name);
      });
    }
  }

  // At this point we have checked every ID
  // folderNames should now contain only folders that didn't match any ID, so
  // we can put them all into the right container
  folderNames.forEach( name => {
    results.orphanFolderNames.push(name);
  });

  Logger.log("foundFolderNames: " + results.foundFolderNames.length /*+ " " + results.foundFolderNames*/);
  Logger.log("foundIds: " + results.foundIds.length /*+ " " + results.foundIds*/);
  Logger.log("orphanFolderNames: " + results.orphanFolderNames.length + " " + results.orphanFolderNames);
  Logger.log("orphanIDs: " + results.orphanIDs.length + " " + results.orphanIDs);
  Logger.log("IDWithMultipleFolders: " + results.IDWithMultipleFolders.length + " " + results.IDWithMultipleFolders);
  Logger.log("duplicateFolders: " + results.duplicateFolders.length + " " + results.duplicateFolders);

  // TODO add throw for errors
  if( false && [results.IDWithMultipleFolders.length,
      results.duplicateFolders.length,
      results.orphanIDs.length].some( value => value > 0)) {
    throw Error(`During checkFoldersAndIDs() execution a problem has been detected:
      IDWithMultipleFolders, duplicateFolders or orphanIDs`);
  }
  return results;
}


function createLavoroObjectFromLavoroRow(lavoroRow) {
  if(typeof lavoroRow != 'number' || lavoroRow < 2) {
    throw Error('invalid row');
  }
  const lavoroObject = {
    row: lavoroRow,
    ref: LAVORI_TABLE[lavoroRow - 1][LAVORI_ID_COLUMN - 1],
    refToCliente: LAVORI_TABLE[lavoroRow - 1][LAVORI_REF_TO_CLIENTE_COLUMN - 1],
    stato: LAVORI_TABLE[lavoroRow - 1][LAVORI_STATO_COLUMN - 1]
  }
  return lavoroObject;
}

function printLavoroInfo(lavoroObject) {
  const whatFolderNameShouldBe = getWhatFolderNameShouldBeForThisLavoro(lavoroObject.row);
  Logger.log("lavoroRow: " + lavoroObject.row);
  Logger.log("lavoroId: " + lavoroObject.ref);
  Logger.log("lavoroStato: " + lavoroObject.stato);
  Logger.log("Name should be: " + whatFolderNameShouldBe);
}

function getAllFoldersWithRef(lavoroRef) {
  if(lavoroRef.length != 8 && typeof lavoroRef != 'string') {
    throw Error(`${lavoroRef} is not a valid argument for getAllFoldersWithRef().`);
  }
  let foundFolders = [];
  let folders;

  Logger.log(`getAllFoldersWithRef(${lavoroRef})`);

  // Look for folder in Lavori In Corso
  Logger.log(`Checking folder LAVORI_IN_CORSO)`);
  folders = DriveApp.getFolderById(LAVORI_IN_CORSO_FOLDER_ID).getFolders();
  while(folders.hasNext()) {
    let folder = folders.next();
    if(folder.getName().includes(lavoroRef)) {
      foundFolders.push(folder);
    }
  }
  // Look for folder in Da Fatturare
  Logger.log(`Checking folder TO_BE_INVOICED)`);
  folders = DriveApp.getFolderById(TO_BE_INVOICED_FOLDER_ID).getFolders();
  while(folders.hasNext()) {
    let folder = folders.next();
    if(folder.getName().includes(lavoroRef)) {
      foundFolders.push(folder);
    }
  }
  // Look for folders in Da Archiviare
  Logger.log(`Checking folder TO_BE_ARCHIVED)`);
  folders = DriveApp.getFolderById(TO_BE_ARCHIVED_FOLDER_ID).getFolders();
  while(folders.hasNext()) {
    let folder = folders.next();
    if(folder.getName().includes(lavoroRef)) {
      foundFolders.push(folder);
    }
  }

  return foundFolders;
}


function moveFolderToCorrectParentFolder(folder, lavoroObject) {
  if(lavoroObject.stato === 'Da Archiviare') {
    if(LAVORI_TABLE[lavoroObject.row - 1][LAVORI_NOTE_LAVORO_COLUMN - 1].toLowerCase().includes('chiara')) {
      sendEmailToCula(lavoroObject);
    }
    createLogFileForThisLavoro(lavoroObject.ref);
    folder.moveTo(DriveApp.getFolderById(TO_BE_ARCHIVED_FOLDER_ID));
  }
  else if(lavoroObject.stato === 'Da Fatturare') {
    folder.moveTo(DriveApp.getFolderById(TO_BE_INVOICED_FOLDER_ID));
  }
  else {
    folder.moveTo(DriveApp.getFolderById(LAVORI_IN_CORSO_FOLDER_ID));
  }
}

function renameFolderCorrectly(folder, lavoroObject) {
  const whatFolderNameShouldBe = getWhatFolderNameShouldBeForThisLavoro(lavoroObject.row);

  if(whatFolderNameShouldBe != folder.getName()) {
    Logger.log(`Folder name is ${folder.getName()}. It should be ${whatFolderNameShouldBe}`);
    folder.setName(whatFolderNameShouldBe);
    Logger.log(`Folder has been renamed`);
  }
  else {
    Logger.log("Folder name is ok, nothing to do.");
  }
}

function createLavoroFolder(lavoroObject) {
  if(!SHOULD_AUTOCREATE_FOLDERS) { return; }
  const whatFolderNameShouldBe = getWhatFolderNameShouldBeForThisLavoro(lavoroObject.row);
  const mainFolder = DriveApp.getFolderById(LAVORI_IN_CORSO_FOLDER_ID);
  const newFolder = mainFolder.createFolder(whatFolderNameShouldBe);
  Logger.log(`New folder has been created: ${newFolder}`);
  return newFolder;
}





function getLavoriToWorkOn(sheetName, activeRange) {
  // We want to work with a single row //TODO implement multiple rows handling
  if(activeRange.getHeight() != 1) {
    throw Error('More than 1 row has changed.');
  }

  Logger.log(`getLavoriToWorkOn(${sheetName} , ${activeRange.getRow()})`);

  let lavoriToWorkOn = [];

  /* lavoroToWorkOn = {
    rowNum: 0,
    ref: '',
    refToCliente: '',
    stato: ''
  }*/

  if(sheetName === LAVORI_SHEET_NAME) {
    Logger.log("Info: a row in LAVORI has changed.");
    const lavoroRow = activeRange.getRow();
    const lavoroObject = createLavoroObjectFromLavoroRow(lavoroRow);
    if(lavoroObject.ref === '') {
      throw Error('ref is empty. Has lavoro been deleted?');
    }
    printLavoroInfo(lavoroObject);
    lavoriToWorkOn.push(lavoroObject);
  }
  else if(sheetName === CLIENTI_SHEET_NAME) {
    Logger.log("Info: a row in CLIENTI has changed.");
    const clienteRow = activeRange.getRow();
    Logger.log("clienteRow: " + clienteRow);
    const clienteRef = CLIENTI_TABLE[clienteRow - 1][CLIENTI_ID_COLUMN - 1];
    Logger.log("clienteRef: " + clienteRef);
    if(clienteRef === '') {
      throw Error('Id is empty. Has cliente been deleted?');
    }
    Logger.log("Lavori refs are being checked...");    
    const lavoroRows = getLavoriRowsWithThisClienteRef(clienteRef); 
    if(lavoroRows.length === 0) {
      throw Error(`A clienteRow has changed but there are no lavori that reference this clienteRow. clienteRow: ${clienteRow}`);
    }
    lavoroRows.forEach( lavoroRow => {
      const lavoroObject = createLavoroObjectFromLavoroRow(lavoroRow);
      printLavoroInfo(lavoroObject);
      lavoriToWorkOn.push(lavoroObject);
    });
  }
  else if(sheetName === LOGS_SHEET_NAME) {
    Logger.log("Info: a row in LOG has changed.");
    const logRow = activeRange.getRow();
    const lavoroRef = LOGS_TABLE[logRow - 1][LOG_REF_TO_LAVORI_COLUMN - 1];
    if(lavoroRef === '') {
      throw Error('ref is empty. Has log been deleted?');
    }
    const lavoroRow = getLavoroRowWithThisRef(lavoroRef);
    const lavoroObject = createLavoroObjectFromLavoroRow(lavoroRow);
    printLavoroInfo(lavoroObject);
    lavoriToWorkOn.push(lavoroObject);
  }
  else {
    throw Error(`invalid sheetName: ${sheetName}`);
  }

  for(let i = 0; i < lavoriToWorkOn.length; i++) {
    Logger.log(`lavoriToWorkOn: ${lavoriToWorkOn[i]}`);
  }

  return lavoriToWorkOn;
}






function onSheetEdits(e) {
  if(!TRIGGER_SHOULD_BE_ACTIVE) { return; }

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

  if(eventType === "EDIT") {
    const lavoriToWorkOn = getLavoriToWorkOn(sheetName, activeRange);

    Logger.log("length of lavoriToWorkOn list: " + lavoriToWorkOn.length);
    if(lavoriToWorkOn.length === 0) {
      throw Error("lavoriToWorkOn was empty and it should not be");
    }
    for(let i = 0; i < lavoriToWorkOn.length; i++) {
      const lavoroFolders = getAllFoldersWithRef(lavoriToWorkOn[i].ref);
      if(lavoroFolders.length > 1) {
        let foundFolders = lavoroFolders.reduce( (acc, lavoroFolder) => {
          Logger.log("folder is: " + lavoroFolder);
          return acc + lavoroFolder.getName() + ' ';
        }, '');
        throw Error(`Found multiple folders for the same lavoro: ${lavoriToWorkOn[i].ref}
              Lavori: ${foundFolders}`);
      }
      else if(lavoroFolders.length === 0) {
        if(SHOULD_AUTOCREATE_FOLDERS) {
          if(sheetName == LOGS_SHEET_NAME) {
            Logger.log("Skipping new folder creation related to log edit. Folder probably already exists");
            //throw Error(`Edited log row but no folder found. Check this lavoro: ${lavoriToWorkOn[0].ref}`);
          }
          moveFolderToCorrectParentFolder(createLavoroFolder(lavoriToWorkOn[i]), lavoriToWorkOn[i]);
        }
      }
      else if(lavoroFolders.length === 1) {
        moveFolderToCorrectParentFolder(lavoroFolders[0], lavoriToWorkOn[i]);
        renameFolderCorrectly(lavoroFolders[0], lavoriToWorkOn[i]);
      }
      else {
        Logger.log("WTF");
      }
    }
  }

  Logger.log("End of trigger in file 'triggers.gs'");
}


