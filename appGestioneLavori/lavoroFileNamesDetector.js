


function testDetector() {
  let starTime = Date.now();

  //let data = prepareRowsForFilesInfoInThisLavoroFolder(createLavoroObjectFromLavoroRow(getLavoroRowWithThisRef('145bc4b6')));
  //let data = prepareRowsForFilesInfoInThisLavoroFolder(createLavoroObjectFromLavoroRow(getLavoroRowWithThisRef('a78e1a88')));

  const data = getFileDataFromLavoriSheet();


  repopulateFileCollegati();



  Logger.log('Finished in ' + (Date.now() - starTime) + ' ms');
}




function clearAllFileEntriesForThisLavoro(lavoroRef) {
  let indexesOfRowsToClear = [];
  let lastRow = FILE_COLLEGATI_SHEET.getLastRow();
  for(let i = 0; i <= lastRow; i++) {

      // TODO FINISH THIS PART







  } 



  FILE_COLLEGATI_TABLE.forEach( (row, i) => {
    if(row[FILE_COLLEGATI_REF_TO_LAVORI_COLUMN - 1] === lavoroRef) {
      indexesOfRowsToClear.push(i + 1);
    }
  });

  indexesOfRowsToClear.forEach( index => {
    FILE_COLLEGATI_SHEET.getRange(index, 1, 1, FILE_COLLEGATI_SHEET.getMaxColumns()).clearContent();
  });

}










function prepareRowsForFilesInfoInThisLavoroFolder(lavoroObject) {
  // Returns a 2d array with the following info for each record:
  //  data = [ 
  //    generateUID(),
  //    lavoroObject.ref,
  //    file.getName(),
  //    file.getDateCreated(),
  //    file.getSize(),
  //    file.getUrl(),
  //    "https://docs.google.com/uc?export=download&confirm=no_antivirus&id=" + file.getId(),
  //    file.getDescription()
  //  ];

  /*
  let folders;  
  try {
    folders = getAllFoldersWithRef(lavoroObject.ref);
  } catch(e) {
    throw Error('there was an error in getFilenamesInLavoroFolder() while getting folders');
  }
  if(folders.length === 0) {
    throw Error('there was an error in getFilenamesInLavoroFolder(): no folders found');
  }
  if(folders.length > 1) {
    throw Error('there was an error in getFilenamesInLavoroFolder(): more than 1 folder found');
  }
  const files = folders[0].getFiles();
  */

  const files = DriveApp.getFolderById(lavoroObject.folderId).getFiles();

  
  // We have the files in the folder, let's list them all
  let file;
  let data;
  let dataCollection = [];

  while(files.hasNext()) {
    file = files.next();

    data = [
      generateUID(),
      lavoroObject.ref,
      file.getName(),
      file.getDateCreated(),
      file.getSize(),
      file.getUrl(),
      "https://docs.google.com/uc?export=download&confirm=no_antivirus&id=" + file.getId(),
      file.getDescription()
    ];

    dataCollection.push(data);
  }
  return dataCollection;
}


function getFileDataFromLavoriSheet() {
  const data = [];

  LAVORI_TABLE.forEach( (lavoro, i) => {
    if(i === 0) return; // Skip headers


    // in an earlier version of this function we assumed that the
    // LAVORI_SHEET didn't have any empty rows. This assumption is dangerous
    // and may lead to unexpected errors. Better to just skip empty rows.
    const lavoroId = lavoro[LAVORI_ID_COLUMN - 1];
    if(lavoroId === '') return;

    const lavoroObject = createLavoroObjectFromRef(lavoroId);


    //Logger.log(`${i} - ${lavoroObject.riferimento}`);

    data.push(...prepareRowsForFilesInfoInThisLavoroFolder(lavoroObject));
  });

  return data;
}




function repopulateFileCollegati() {
  // Data must be a 2d array of already prepared rows

  const data = getFileDataFromLavoriSheet();

  // We empty the sheet
  try {
    FILE_COLLEGATI_SHEET.deleteRows(2, FILE_COLLEGATI_SHEET.getLastRow() - 1);
  } catch(e) {
    Logger.log(`Couldn't delete rows. Sheet is probably empty`);
  }

  FILE_COLLEGATI_SHEET.getRange(2, 1, data.length, data[0].length).setValues(data);
}



// TODO SCRIVERE FUNZIONE CHE RILEVI I FILE AL CONTRARIO:
// Scorre ogni cartella, dal nome cartella rileva l'id del lavoro 
// crea un record in un foglio a parte per ogni file, legandolo all'id del lavoro


















function generateUID() {
  // Helper function to generate a UNIQUEID like appsheet does
  let values = '0123456789abcdefghijklmnopqrstuvwxyz';
  let UID = '';
  for(let i = 0; i < 8; i++) {
  UID += values.charAt(Math.floor(Math.random() * values.length));
  }
  return UID;
}
