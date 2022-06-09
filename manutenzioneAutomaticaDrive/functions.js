/***
 * config.gs is .gitignore'd for privacy reasons
 */















 function sendEmailNotification(addresses, message, subject = CONFIG.EMAIL_DEFAULT_SUBJECT) {
  MailApp.sendEmail(addresses, subject, message);
  Logger.log(`Email sent to ${addresses}`);
}

/*
Exception: I parametri (number[],String,String) non corrispondono alla firma del metodo per MailApp.sendEmail.
    at sendEmailNotification(functions:7:11)
    at scannerFolderCleanup(functions:60:5)
    at dailyCleanup(functions:13:3)
*/


function dailyCleanup() {
  scannerFolderCleanup();
  rootFolderCleanup();
}


// THIS FUNCTION IS READY BUT ACTIVATOR IS NOT SET
function scannerFolderCleanup() {
  Logger.log('Initiating scanner folder cleanup...');

  // This will be reused later, no const needed
  let notificationBody = '\n\nI seguenti file erano presenti nella cartella "Scansioni su computer Palma" e sono stati eliminati: \n\n';
  let deletedFiles = [];

  // Get all files in root folder, set them as trashed and log filename

  const folderIterator = DriveApp.getFoldersByName('Scansioni su computer Palma');

  const folders = (() => {
    // return all found folders. throw if more than 1 folder is found
    let folders = [];
    while(folderIterator.hasNext()) {
      folders.push(folderIterator.next());
    }
    if(folders.length != 1) {
      throw Error(`Found ${folders.length} folders with that name and that shouldn't happen`);
    }
    return folders;
  })();

  // Iterate over files in that folder
  const iterator = folders[0].getFiles();
  let file;
  while(iterator.hasNext()) {
    file = iterator.next();
    deletedFiles.push(file.getName());
    file.setTrashed(true);
    //Logger.log(`FAKE: setTrashed ${file.getName()}`);
  }

  // Send email notification about deletion, if necessary
  if(deletedFiles.length === 0) {
    Logger.log('No cleanup to be done.');
    return;
  }
  else {
    deletedFiles = '- ' + deletedFiles.join('\n- ');
    notificationBody += deletedFiles;
    sendEmailNotification(CONFIG.NOTIFICATION_ADDRESSES.join(','), notificationBody);
    //Logger.log(`FAKE: sent email ${notificationBody}`);
    Logger.log('Cleanup done.');
  }
}








function rootFolderCleanup() {
  Logger.log('Initiating root folder cleanup...');

  // This will be reused later, no const needed
  let notificationBody = '\n\nI seguenti file erano presenti nella cartella principale di Drive e sono stati eliminati: \n\n';
  let deletedFiles = [];

  // Get all files in root folder, set them as trashed and log filename
  const iterator = DriveApp.getRootFolder().getFiles();
  let file;
  while(iterator.hasNext()) {
    file = iterator.next();
    deletedFiles.push(file.getName());
    file.setTrashed(true);
  }

  // Send email notification about deletion, if necessary
  if(deletedFiles.length === 0) {
    Logger.log('No cleanup to be done.');
    return;
  }
  else {
    deletedFiles = '- ' + deletedFiles.join('\n - ');
    notificationBody += deletedFiles;
    sendEmailNotification(CONFIG.MAIN_NOTIFICATION_ADDRESS, notificationBody);
    Logger.log('Cleanup done.');
  }
}



