/***
 * config.gs is .gitignore'd for privacy reasons
 */


 function sendEmailNotification(addresses, message, subject = CONFIG.EMAIL_DEFAULT_SUBJECT) {
  MailApp.sendEmail(addresses, subject, message);
  Logger.log(`Email sent to ${addresses}`);
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
    deletedFiles = deletedFiles.join('\n - ');
    notificationBody += deletedFiles;
    sendEmailNotification(CONFIG.MAIN_NOTIFICATION_ADDRESS, notificationBody);
    Logger.log('Cleanup done.');
  }  
}



