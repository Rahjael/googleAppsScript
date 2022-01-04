function backupLavoriDaArchiviare() {
  // Scans main lavori table for "Da Archiviare" and backs them up in another sheet

  // XXX This is very important:
  // Checks if headers are still the same as when this function was written
  // Things might change in the future and I may forget to adapt this as well
  // This part warns me if things are not the way they should be.
  const LAVORI_HEADERS = ['IdLavoro','Cliente','Riferimento','Stato','Note sul lavoro','Foto Riferimento','Agente / Responsabile'];
  const LOG_HEADERS = ['IdLog','Lavoro','Data','Informazioni'];

  // Crosscheck tests
  /*
  Logger.log(LAVORI_HEADERS.every( header => LAVORI_TABLE[0].includes(header)));
  Logger.log(LAVORI_TABLE[0].every( header => LAVORI_HEADERS.includes(header)));
  Logger.log(LOG_HEADERS.every( header => LOGS_TABLE[0].includes(header)));
  Logger.log(LOGS_TABLE[0].every( header => LOG_HEADERS.includes(header)));

  This solution was actually pretty redundant. Better to use a for and check both tables
  at the same time in one sweep
  */

  // Check lavori headers with a single sweep per table:
  let areHeadersOk = true;
  for(let i = 0; i < LAVORI_HEADERS.length && i < LAVORI_TABLE[0].length; i++) {
    if(LAVORI_TABLE[0][i] != LAVORI_HEADERS[i]) {
      areHeadersOk = false;
    }
  }
  for(let i = 0; i < LOG_HEADERS.length && i < LOGS_TABLE[0].length; i++) {
    if(LOGS_TABLE[0][i] != LOG_HEADERS[i]) {
      areHeadersOk = false;
    }
  }
  if(!areHeadersOk) {
    throw Error('BACKUP IS IMPOSSIBLE: headers have changed in the app. Please check.');
  }
  
  // Load necessary stuff and proceed to backup
  const ARCHIVIO_LAVORI_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(ARCHIVIO_LAVORI_SHEET_NAME);
  const ARCHIVIO_LOG_SHEET = SpreadsheetApp.openById(GESTIONE_LAVORI_SPREADSHEET_ID).getSheetByName(ARCHIVIO_LOG_SHEET_NAME);

  // INFO:
  // I use the String() constructor a couple of times here.
  // The reason is some values of UNIQUEID() are just digits and 
  // js interprets those as numbers, which is dangerous in this context.
  // String() has a bit of an overhead but it is acceptable here.

  const alreadyArchivedIDS = ARCHIVIO_LAVORI_SHEET.getSheetValues(2, 1, ARCHIVIO_LAVORI_SHEET.getLastRow(), ARCHIVIO_LAVORI_SHEET.getLastColumn()).map( row => String(row[LAVORI_ID_COLUMN - 1]));

  const lavoriDaArchiviare = LAVORI_TABLE.filter( row => {
    return row[LAVORI_STATO_COLUMN - 1] === 'Da Archiviare' && !alreadyArchivedIDS.includes(row[LAVORI_ID_COLUMN - 1]);
  });
  const IDS = lavoriDaArchiviare.map( row => String(row[LAVORI_ID_COLUMN - 1]));
  const logDaArchiviare = LOGS_TABLE.filter( row => IDS.includes(row[LOG_REF_TO_LAVORI_COLUMN - 1]));

  const newlyArchived = IDS.map( id => createLavoroObjectFromRef(id));

  // Sort the array to get a better email body later on
  newlyArchived.sort((a, b) => {
    a = a.cliente.toLowerCase();
    b = b.cliente.toLowerCase();
    if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    } else {
      return 0;
    }
  });

  const emailReportBody = newlyArchived.reduce( (body, currentLavoro) => {
    let currentLavoroText = `\n${currentLavoro.cliente} - ${currentLavoro.riferimento}`;
    return body + currentLavoroText;

  }, 'I seguenti lavori sono stati archiviati sul database di backup: \n\n');


  try {
    // Paste data to the sheets
    if(lavoriDaArchiviare.length > 0) {
      ARCHIVIO_LAVORI_SHEET.getRange(ARCHIVIO_LAVORI_SHEET.getLastRow() + 1, 1, lavoriDaArchiviare.length, lavoriDaArchiviare[0].length).setValues(lavoriDaArchiviare);
      //sendEmailTo(ADMIN_EMAIL, emailReportBody, 'Notifica archiviazione lavori');
      sendEmailTo(NOTIFICATION_ADDRESSES.join(', '), emailReportBody, 'Notifica archiviazione lavori');
    }
    if(logDaArchiviare.length > 0) {
      //ARCHIVIO_LOG_SHEET.getRange(ARCHIVIO_LOG_SHEET.getLastRow() + 1, 1, logDaArchiviare.length, logDaArchiviare[0].length).setValues(logDaArchiviare);
    }
  } catch(e) {
    sendEmailTo(ADMIN_EMAIL, e);
    return;
  }
}
