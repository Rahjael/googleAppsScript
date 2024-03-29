const GESTIONE_LAVORI_SPREADSHEET_ID = '';
const LAVORI_IN_CORSO_FOLDER_ID = '';
const TO_BE_INVOICED_FOLDER_ID = '';
const TO_BE_ARCHIVED_FOLDER_ID = '';
const INVOICED_FOLDER_ID = '';

const FOLDERNAMES_TO_IGNORE = [];


const ADMIN_EMAIL = '';
const MAIN_AGENT_EMAIL = '';
//const ADMINISTRATIVE_OFFICE_EMAIL = ''
const MAIN_NOTIFICATION_EMAIL = '';
const NOTIFICATION_ADDRESSES = [ADMIN_EMAIL, MAIN_AGENT_EMAIL, MAIN_NOTIFICATION_EMAIL];

const EMAIL_OBJECT = '';





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


const PRIVATE_INFO = [GESTIONE_LAVORI_SPREADSHEET_ID, LAVORI_IN_CORSO_FOLDER_ID, TO_BE_INVOICED_FOLDER_ID, TO_BE_ARCHIVED_FOLDER_ID, ...NOTIFICATION_ADDRESSES];

if(PRIVATE_INFO.some( data => data === '' || data === undefined)) {
  throw Error('Did you forget to fill in private info?');
}



//
// Debugging config
//
let IS_DEBUGGING_EXECUTION = false;

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
  TO_BE_ARCHIVED_FOLDER_ID,
  INVOICED_FOLDER_ID
];


const LAVORI_SHEET_NAME = 'LAVORI';
const CLIENTI_SHEET_NAME = 'CLIENTI';
const LOGS_SHEET_NAME = 'LOG';
const FILE_COLLEGATI_SHEET_NAME = 'FILE_COLLEGATI';
const ARCHIVIO_LAVORI_SHEET_NAME = 'ARCHIVIO_LAVORI';
const ARCHIVIO_LOG_SHEET_NAME = 'ARCHIVIO_LOG';

const TO_BE_ARCHIVED_FOLDER_NAME = 'AAAAA DA ARCHIVIARE';
const TO_BE_INVOICED_FOLDER_NAME = 'AAAAA DA FATTURARE';
const INVOICED_FOLDER_NAME = 'AAAAA FATTURATO';

// Hooks to the actual Drive sheets
const CLIENTI_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(CLIENTI_SHEET_NAME);
const LAVORI_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(LAVORI_SHEET_NAME);
const LOGS_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(LOGS_SHEET_NAME);
const FILE_COLLEGATI_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(FILE_COLLEGATI_SHEET_NAME);
const TEST_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName('TEST');

// Sheets copies in the form of 2d arrays, for better overall performance and ease of access
const CLIENTI_TABLE = CLIENTI_SHEET.getRange(1, 1, CLIENTI_SHEET.getLastRow(), CLIENTI_SHEET.getLastColumn()).getValues();
const LAVORI_TABLE = LAVORI_SHEET.getRange(1, 1, LAVORI_SHEET.getLastRow(), LAVORI_SHEET.getLastColumn()).getValues();
const LOGS_TABLE = LOGS_SHEET.getRange(1, 1, LOGS_SHEET.getLastRow(), LOGS_SHEET.getLastColumn()).getValues();
const FILE_COLLEGATI_TABLE = FILE_COLLEGATI_SHEET.getRange(1, 1, FILE_COLLEGATI_SHEET.getLastRow(), FILE_COLLEGATI_SHEET.getLastColumn()).getValues();

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
const LAVORI_DRIVEFOLDERID_COLUMN = 8;

const CLIENTI_ID_COLUMN = 1;
const CLIENTI_NOME_COLUMN = 2;

const LOG_ID_COLUMN = 1;
const LOG_REF_TO_LAVORI_COLUMN = 2;

const FILE_COLLEGATI_REF_TO_LAVORI_COLUMN = 2;
















function test() {  
  Logger.log(getFilesListForThisLavoro('b76f9fc8'));
}


function sendEmailToMainAgent(lavoroObject) {
  const address = MAIN_AGENT_EMAIL;
  const subject = 'Notifica archiviazione lavoro';
  const lavoroName = getWhatFolderNameShouldBeForThisLavoro(lavoroObject.row);

  const message = `Un lavoro gestito da te è stato contrassegnato come "Da Archiviare" e verrà presto archiviato: 
  
    ${lavoroName}`;

  MailApp.sendEmail(address, subject, message);

  Logger.log(`Email sent to ${address}`);
}


function sendEmailTo(addresses, message, subject = 'Notifica da Duale App Gestione Lavori') {
  MailApp.sendEmail(addresses, subject, message);
  Logger.log(`Email sent to ${addresses}`);
}


function getFilesListForThisLavoro(lavoroRef) {
  // Returns an array of strings

  const foundFolders = getAllFoldersWithRef(lavoroRef);

  if(foundFolders.length === 0) {
    throw Error('ERROR: getFilesListForThisLavoro() found 0 folders');
  }
  if(foundFolders.length > 1) {
    throw Error('ERROR: getFilesListForThisLavoro() found more than 1 folders');
  }

  const fileIterator = foundFolders[0].getFiles();
  const filenames = [];

  while (fileIterator.hasNext()) {
    let file = fileIterator.next();
    filenames.push(file.getName());
  }

  return filenames;
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
  let finalReport = '';
  sheets.forEach( sheet => {
    let removedRows = 0;
    let containsEmptyRows = true;
    let currentColumnA;

    while(containsEmptyRows) {
      containsEmptyRows = false;
      let startAt;
      let howMany = 0;

      // XXX Can I optimize this call? Not sure. I would like to reduce this to a single call,
      // the problem is that every deleteRows(start, howmany) would change the indexes, resulting in disaster.
      // There is no other API that I know of to delete rows in bulk. So I have to stick to this for the time being.
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
        //Logger.log(`Removed ${removedRows} rows in ${Date.now() - started} ms from script start`);
      }
    }
    finalReport += `\nRemoved ${removedRows} rows from sheet ${sheet.getName()} in ${Date.now() - started} ms from script start`;
  });

  sendEmailTo(MAIN_NOTIFICATION_EMAIL, finalReport, 'App Gestione Lavori database cleanup');
  Logger.log(`Empty rows cleanup done in ${Date.now() - started} ms`);
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



function maintainDriveFolderIDs() {
  //
  //
  // !!! WARNING !!! this function uses sheet.setValue() or writes to the actual app's database in some way.
  //
  //

  IS_DEBUGGING_EXECUTION = true; // disables all unnecessary logs in other functions for this execution


  // Function assumes no empty rows are present in LAVORI sheet
  deleteEmptyRowsFromEverySheet();

  // Info to gather and report later
  let relevantLogs = ['Report for Drive folders maintenance: \n\n'];
  let startTime = Date.now();

  // An old version of this function used to call getAllFoldersWithRef() for every record.
  // That was madness, since it unnecessarily cycled through all the actual folders N times.
  // As usual, it is much faster to gather all the folders once, and then cycle the JS array
  const allFolders = (() => {
    const toReturn = [];
    RELEVANT_FOLDERS_IDS.forEach( folder => {
      const folderIterator = DriveApp.getFolderById(folder).getFolders();
      while(folderIterator.hasNext()) {
        let folder = folderIterator.next();
        toReturn.push(folder);
      }
    });
    return toReturn;
  })();

  const getMatchingFolders = (lavoroRef) => {
    return allFolders.filter( folder => folder.getName().includes(lavoroRef));
  }

  LAVORI_TABLE.forEach( (lavoro, i) => { // REMINDER: "lavoro" is an entire row in the sheet. Here, an array
    if(i === 0) return;

    const lavoroObject = createLavoroObjectFromLavoroRow(i + 1);

    Logger.log(`${i} Checking folder for ${lavoroObject.cliente} - ${lavoroObject.riferimento}`);

    // If the record does not contain an id for the folder, look for it
    if(lavoro[LAVORI_DRIVEFOLDERID_COLUMN - 1] === '') {
      const foldersFound = getMatchingFolders(lavoro[LAVORI_ID_COLUMN - 1]);
      // If a single folder is correctly found, assign it to the record in the actual sheet
      if(foldersFound.length != 1) {
        relevantLogs.push(`!!! CHECK ${lavoroObject.cliente} - ${lavoroObject.riferimento}: no folders or too many found.`);
      }
      else{
        // assign proper folder id to record
        LAVORI_SHEET.getRange(lavoroObject.row, LAVORI_DRIVEFOLDERID_COLUMN).setValue(foldersFound[0].getId());
        relevantLogs.push(`OK - assigned ${foldersFound[0].getId()} to ${lavoroObject.riferimento}`);
      }
    }
    else {
    // If the record already contains a folder Id, check if related folder contains the proper hook

      // This try block is necessary. DriveApp.getFolderById() throws if no folder is found.
      try {
        const folder = DriveApp.getFolderById(lavoroObject.folderId);
        // If a folder is found, check if it contains a correct hook
        if(!folder.getName().includes(lavoroObject.ref)) {
          relevantLogs.push(`!!! CHECK ${lavoroObject.cliente} - ${lavoroObject.riferimento}: record contains folder's id but folder's hook is incorrect`);
        }
      } catch(e) {
        // If no folder with that id is found, report it but keep going
        relevantLogs.push(`!!! CHECK ${lavoroObject.cliente} - ${lavoroObject.riferimento}: there was an error retrieving a folder with id (${lavoroObject.folderId}) `);
      }
    }
  });

  // If nothing has been done
  if(relevantLogs.length === 1) {
    relevantLogs.push('Folders are fine, nothing to do.');
  }

  relevantLogs.push(`\n\n\nMaintenance done in ${Date.now() - startTime} ms`);
  relevantLogs = relevantLogs.join('\n');
  sendEmailTo(MAIN_NOTIFICATION_EMAIL, relevantLogs, 'Report controllo cartelle Drive');
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
    if([...RELEVANT_FOLDERS_IDS, ...FOLDERNAMES_TO_IGNORE].some( name => name === folderName)) {
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

  // Check INVOICED
  folders = DriveApp.getFolderById(INVOICED_FOLDER_ID).getFolders();
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









function createLavoroObjectFromRef(lavoroRef) {
  if(typeof lavoroRef != 'string') {
    throw Error(`createLavoroObjectFromRef(): invalid argument: ${lavoroRef}`);
  }

  const lavoroRow = (() => {
    for(let i = 0; i < LAVORI_TABLE.length; i++) {
      if(LAVORI_TABLE[i][LAVORI_ID_COLUMN - 1] === lavoroRef) {
        return i + 1;
      }
    }
    throw Error(`createLavoroObjectFromRef(): LAVORO not found for this ref: ${lavoroRef}`);
  })();

  const lavoroObject = createLavoroObjectFromLavoroRow(lavoroRow);
  
  return lavoroObject;
}

function createLavoroObjectFromLavoroRow(lavoroRow) {
  if(typeof lavoroRow != 'number' || lavoroRow < 2) {
    throw Error(`createLavoroObjectFromLavoroRow() was fed invalid row: ${lavoroRow}`);
  }
  const refToCliente = LAVORI_TABLE[lavoroRow - 1][LAVORI_REF_TO_CLIENTE_COLUMN - 1];
  const clienteName = (() => {
    for(let i = 0; i < CLIENTI_TABLE.length; i++) {
      if(CLIENTI_TABLE[i][CLIENTI_ID_COLUMN - 1] === refToCliente) {
        return CLIENTI_TABLE[i][CLIENTI_NOME_COLUMN - 1];
      }
    }
    throw Error(`createLavoroObjectFromLavoroRow(): CLIENTE not found for this ref: ${refToCliente}`);
  })();

  const lavoroObject = {
    row: lavoroRow,
    ref: LAVORI_TABLE[lavoroRow - 1][LAVORI_ID_COLUMN - 1],
    refToCliente: refToCliente,
    cliente: clienteName,
    riferimento: LAVORI_TABLE[lavoroRow - 1][LAVORI_RIFERIMENTO_COLUMN - 1],
    stato: LAVORI_TABLE[lavoroRow - 1][LAVORI_STATO_COLUMN - 1],
    folderId: LAVORI_TABLE[lavoroRow - 1][LAVORI_DRIVEFOLDERID_COLUMN - 1]
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

  if(!IS_DEBUGGING_EXECUTION) Logger.log(`getAllFoldersWithRef(${lavoroRef})`);

  // Look for folder in Lavori In Corso
  if(!IS_DEBUGGING_EXECUTION) Logger.log(`Checking folder LAVORI_IN_CORSO)`);
  folders = DriveApp.getFolderById(LAVORI_IN_CORSO_FOLDER_ID).getFolders();
  while(folders.hasNext()) {
    let folder = folders.next();
    if(folder.getName().includes(lavoroRef)) {
      foundFolders.push(folder);
    }
  }
  // Look for folder in Da Fatturare
  if(!IS_DEBUGGING_EXECUTION) Logger.log(`Checking folder TO_BE_INVOICED)`);
  folders = DriveApp.getFolderById(TO_BE_INVOICED_FOLDER_ID).getFolders();
  while(folders.hasNext()) {
    let folder = folders.next();
    if(folder.getName().includes(lavoroRef)) {
      foundFolders.push(folder);
    }
  }
  // Look for folders in Da Archiviare
  if(!IS_DEBUGGING_EXECUTION) Logger.log(`Checking folder TO_BE_ARCHIVED)`);
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
      sendEmailToMainAgent(lavoroObject);
    }
    createLogFileForThisLavoro(lavoroObject.ref);
    folder.moveTo(DriveApp.getFolderById(TO_BE_ARCHIVED_FOLDER_ID));
  }
  else if(lavoroObject.stato === 'Da Fatturare') {
    folder.moveTo(DriveApp.getFolderById(TO_BE_INVOICED_FOLDER_ID));
  }
  else if(lavoroObject.stato === 'Fatturato') {
    folder.moveTo(DriveApp.getFolderById(INVOICED_FOLDER_ID));
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
  //
  //
  // !!! WARNING !!! this function uses sheet.setValue() or writes to the actual app's database in some way.
  //
  //
  if(!SHOULD_AUTOCREATE_FOLDERS) { return; }
  const whatFolderNameShouldBe = getWhatFolderNameShouldBeForThisLavoro(lavoroObject.row);
  const mainFolder = DriveApp.getFolderById(LAVORI_IN_CORSO_FOLDER_ID);
  const newFolder = mainFolder.createFolder(whatFolderNameShouldBe);
  Logger.log(`New folder has been created: ${newFolder}`);

  // Now we add the new folder Id to the proper record in the database sheet:
  LAVORI_SHEET.getRange(lavoroObject.row, LAVORI_DRIVEFOLDERID_COLUMN).setValue(newFolder.getId());
  Logger.log(`Folder id "${newFolder.getId()}" has been attached to record at line ${lavoroObject.row} for lavoro ${lavoroObject.riferimento}`);

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
          else {
            moveFolderToCorrectParentFolder(createLavoroFolder(lavoriToWorkOn[i]), lavoriToWorkOn[i]);
          }
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


