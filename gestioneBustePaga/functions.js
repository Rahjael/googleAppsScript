const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const CURRENT_MONTH = (() => {
  // Using modulo to account for the fact that the needed month is not the current but the previous
  return MONTHS[(((new Date()).getMonth() + 11) % 12)];
})();
const CURRENT_YEAR = new Date().getFullYear();


function test() {
  Logger.log(getEmployeesData());
}


function performMonthlyRoutine() {
  // This function should be set as automated task to run every month
  let reportBody = '';

  // Check if there are pdf files to send
  let filesToSend = getFilesToSend().filter(file => file.getName().includes('.pdf'));
  let sentFiles = [];
  Logger.log(`Found ${filesToSend.length} files:`);
  filesToSend.forEach(file => Logger.log(file.getName()));
  // We exit if no pdf is found
  if(filesToSend.length === 0) {
    Logger.log('No files to send. Reporting and exiting.');
    reportToAdmin('ATTENZIONE: Non ci sono buste paga da inviare.');
    return;
  }
  // Gather the data we need and create an array of objects
  let employeesData = getEmployeesData();
  // If there are files to send, attach every file to each employee object.
  // If attached, remove it from the list
  employeesData.forEach( employee => {
    filesToSend.forEach( (file, i, arr) => {
      if(file.getName().includes(employee.cf)) {
        employee.file = file; // !!! This is a google "File" object, not a string, nor a javascript object
        arr.splice(i, 1);
      }
    });
  });
  // Send an email to every employee
  reportBody += `Sono state inviate le buste paga ai seguenti dipendenti:\n`;
  employeesData.forEach( employee => {
    if(employee.file) {
      sendPaycheckToEmployee(employee);
      sentFiles.push(employee.file);
      reportBody += `\n - ${employee.name}`;
    }
    else {
      reportToAdmin(`ATTENZIONE: non è stata trovata nessuna busta paga per il dipendente ${employee.name}.`);
    }
  });
  // Add leftover files to the report
  if(filesToSend.length > 0) {
    reportBody += `\n\nI seguenti file non sono associabili a nessuna busta paga di questa sessione e verranno lasciati nella cartella dello script: `;
    filesToSend.forEach(file => reportBody += `\n - ${file.getName()}`);
  }
  // Once we have sent every email, we can rename files and archive them.
  // So, first we prepend every file with a two digit number for easier browsing
  // This looks messy but it's actually very simple: if CURRENT_MONTH is February, we prepend '02' to the file.
  // TODO: REFACTOR THIS SHIT???
  sentFiles.forEach( file => {
    const numberToPrepend = (() => {
      let num = (MONTHS.indexOf(CURRENT_MONTH) + 1).toString();
      if(num.length === 1) {
        num = '0' + num;
      }
      return num;
    })();
    const newFileName = numberToPrepend + ' - ' + file.getName();
    file.setName(newFileName);
  });
  // Once the files have been renamed, we can move them to the archive
  sentFiles.forEach( file => {
    file.moveTo(DriveApp.getFolderById(CONFIG.ARCHIVE_FOLDER_ID));
  });

  reportToAdmin(reportBody);

  Logger.log('Monthly routine correctly performed');
}




function getFilesToSend() {
  const filesInFolder = DriveApp.getFolderById(CONFIG.SCRIPT_FOLDER_ID).getFiles();
  const filesToSend = [];
  while(filesInFolder.hasNext()) {
    filesToSend.push(filesInFolder.next());
  }
  return filesToSend;
}
function sendPaycheckToEmployee(employeeObject) {
  MailApp.sendEmail({
    to: employeeObject.email,
    subject: CONFIG.EMPLOYEES_EMAIL_STANDARD_OBJECT,
    body: CONFIG.EMPLOYEES_EMAIL_STANDARD_TEXT(employeeObject.name),
    attachments: [employeeObject.file.getAs(MimeType.PDF)] // This is because to manipulate files inside Google you mostly need Blobs
  });
  Logger.log(`Email sent to ${employeeObject.email}`);
}

/**
 * @returns {Object[]} - {name, email, cf}
 */
function getEmployeesData() {
  // Get range from spreadsheet
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.DATA_SHEET_NAME);
  // Get info about employees and return an array of objects
  let data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  data = data.map( row => {
    return {
      name: row[CONFIG.EMPLOYEE_COLUMN - 1],
      email: row[CONFIG.EMAIL_COLUMN - 1],
      cf: row[CONFIG.CF_COLUMN - 1]
    }
  });
  return data;
}

function reportToAdmin(message, subject = CONFIG.ADMIN_REPORT_DEFAULT_SUBJECT) {
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, message);
  Logger.log(`Report email sent`);
}
