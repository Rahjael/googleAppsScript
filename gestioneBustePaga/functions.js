const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const CURRENT_MONTH = (() => {
  // Using modulo to account for the fact that the needed month is not the current but the previous
  return MONTHS[(((new Date()).getMonth() + 11) % 12)];
})();
const CURRENT_YEAR = new Date().getFullYear();




function test() {
  Logger.log(getEmployeesData());
  Logger.log(CURRENT_MONTH);
}


function performMonthlyRoutine() {
  // This function should be set as automated task to run once a month


  // Gather the data we need
  const employeesData = getEmployeesData();
  const filesToSend = getFilesToSend();

  if(filesToSend.length === 0) {
    Logger.log('No files found to be sent. Reporting and exiting.');
    reportToAdmin('Non ci sono buste paga da inviare.');
    return;
  }
  if(filesToSend.length != employeesData.length) {
    Logger.log(`Number of files in to be sent folder (${filesToSend.length}) is different from number of employees (${employeesData.length}). Reporting and exiting.`);
    reportToAdmin(`Number of files in to be sent folder (${filesToSend.length}) is different from number of employees (${employeesData.length}). Reporting and exiting.`);
    return;
  }

  // If there are files to send, associate every file to each employee
  employeesData.forEach( employee => {
    filesToSend.forEach( file => {
      if(file.getName().includes(employee.cf)) {
        employee.file = file; // !!! This is a google "File" object, not a string, nor a javascript object
      }
    });
  });

  // Send an email to every employee
  employeesData.forEach( employee => {
    sendPaycheckToEmployee(employee);
  });

  // Once we have sent every email, we can rename files and archive them.
  // So, first we prepend every file with a two digit number for easier browsing
  // This looks messy but it's actually very simple: if CURRENT_MONTH is February, we prepend '02' to the file.
  filesToSend.forEach( file => {
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
  filesToSend.forEach( file => {
    file.moveTo(CONFIG.ARCHIVE_FOLDER);
  });

  // Prepare reports:
  const emailSentTo = '';  
  employeesData.forEach( empl => {
    emailSentTo += `
      ${empl.name}`;
  });
  
  reportToAdmin(`I pdf degli stipendi sono stati inviati ai seguenti dipendenti: 
    ${emailSentTo}`);


  Logger.log('Monthly routine correctly performed');
}




function getFilesToSend() {
  const filesInFolder = DriveApp.getFolderById(CONFIG.FILES_TO_SEND_FOLDER_ID).getFiles();
  const filesToSend = [];
  while(filesInFolder.hasNext()) {
    filesToSend.push(filesInFolder.next());
  }
  return filesToSend;
}



function sendPaycheckToEmployee(employeeObject) {
  MailApp.sendEmail({
    to: employeeObject.email,
    subject: CONFIG.EMAIL_STANDARD_OBJECT,
    body: CONFIG.EMAIL_STANDARD_TEXT(employeeObject.name),
    attachments: [employeeObject.file.getAs(MimeType.PDF)] // This is because to manipulate files inside Google you mostly need Blobs
  });

  Logger.log(`Email sent to ${employeeObject.email}`);
}


function getEmployeesData() {
  // Get range from spreadsheet
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.DATA_SHEET_NAME);

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
