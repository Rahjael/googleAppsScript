function test() {
  let referenceDate = new Date(2022,0,11);
  referenceDate.setMonth((((new Date(2022,0,11)).getMonth() + 11) - 1) % 12);

  Logger.log((new Date(2022,3,11)).getMonth())
  Logger.log((((new Date(2022,3,11)).getMonth() + 12) - 1) % 12)


  let date1 = new Date(2022, 10, 21);
  let date2 = new Date(2022,10, 22);

  Logger.log(date2 - date1);
}
function dailyRoutine() {
  let data = getAllData();
  //let date = new Date(2022, 10, 20);
  let date = new Date();
  let errors = checkRecordsForDate(data, date);
  if(errors.length) dailyErrorReport(errors);
}
function checkRecordsForDate(records, date) {
  date = date.toLocaleDateString();
  const errors = [];
  records = records.filter(record => date === record.date.toLocaleDateString());
  records = sortByDateForEveryUser(records); // Divide by user and sort chronologically

  CONFIG.USEREMAILS.forEach(user => {
    for (let i = 0; i < records[user].length; i++) {
      if (i % 2 === 0 && records[user][i].type != 'Ingresso') {
        errors.push(records[user][i]);
        break;
      }
      if (i % 2 != 0 && records[user][i].type != 'Uscita') {
        errors.push(records[user][i]);
        break;
      }
    }
    if (records[user].length % 2 != 0) {
      errors.push(`ATTENZIONE: rilevato un errore nei record del giorno ${date} per l'utente ${user}`);
    }
  });  
  return errors;
}
function dailyErrorReport(errors) {
  let subject = 'Errore in orario dipendenti'
  let body = `Sono stati rilevati errori per i seguenti record: \n\n`;
  errors.forEach(record => body += '- ' + JSON.stringify(record) + '\n');

  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
}
function getAllData() {
  // Acquire table, format everything as JS data
  // id, email, dateTime, "Ingresso" / "Uscita"
  const data = CONFIG.SOURCE_SHEET.getRange(2, 1, CONFIG.SOURCE_SHEET.getLastRow() - 1, CONFIG.SOURCE_SHEET.getLastColumn()).getValues().map( row => {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
    // example const birthday2 = new Date('1995-12-17T03:24:00')   // This is ISO8601-compliant and will work reliably
    // 18/11/2022 11:49:19 >>>>> 2022-11-18T11:49:19
    let date = row[2].slice(6, 10) + '-' + row[2].slice(3, 5) + '-' + row[2].slice(0, 2) + 'T' + row[2].slice(11, 19);
    return {id: row[0], user: row[1], date: new Date(date), type: row[3]};
  });

  return data;
}
function sortByDateForEveryUser(data) {
  // We prepare a container for every user...
  const recordsByUser = {};
  CONFIG.USEREMAILS.forEach(email => recordsByUser[email] = []);
  // ... we divide the records by user, putting them into the appropriate container...
  data.forEach(record => recordsByUser[record.user].push(record));
  // ... we sort the records for every user...
  CONFIG.USEREMAILS.forEach(useremail => {
    recordsByUser[useremail].sort((record1, record2) => {
      return record1.date - record2.date;
    });
  });
  //CONFIG.USEREMAILS.forEach(useremail => Logger.log(recordsByUser[useremail]));
  return recordsByUser;
}
function monthlyRoutine() {
  const data = getAllData(); // "data" now contains all the records in JS format
  //data.forEach(item => Logger.log(item));

  const monthlyMaxes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let referenceMonth = (((new Date()).getMonth() + 12) - 1) % 12; // Get 0-index previous month
  let errorsFound = false;
  for (let i = 1; i <= monthlyMaxes[referenceMonth]; i++) {
    let date = new Date();
    date.setMonth(referenceMonth);
    date.setDate(i);
    if(date.getMonth() === 11) date.setFullYear(date.getFullYear() - 1);

    let errors = checkRecordsForDate(data, date);

    if(errors.length != 0) {
      errorsFound = true;
      break;
    }
  }

  if(errorsFound) {
    let subject = `Impossibile generare il report mensile delle ore dipendenti`;
    let body = `Sono stati trovati errori nell'elaborazione del report mensile. Controllare i dati.`;
    MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
    return;
  }

  /**
   * If we get to this point we can assume our data doesn't contain any errors
   */
  const recordsByUser = sortByDateForEveryUser(data); // Divide by user and sort chronologically

  let mailReport = `Report mensile ore dipendenti: \n\n`;

  CONFIG.USEREMAILS.forEach(user => {
    let total = 0;
    for (let i = recordsByUser[user].length - 1; i > 0; i -= 2) {
      total += recordsByUser[user][i].date - recordsByUser[user][i - 1].date;
    }
    total = total / 1000 / 60;

    mailReport += `- ${user}: ${Math.floor(total / 60)} ore ${Math.floor(total % 60)} minuti \n`;
  });
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, 'Report mensile ore dipendenti', mailReport);
}