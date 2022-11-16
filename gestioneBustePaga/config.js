const CONFIG = {
  ADMIN_EMAIL: '',
  ADMIN_REPORT_DEFAULT_SUBJECT: 'Notifica da Duale Tappezzeria - Gestione buste paga',
  SCRIPT_FOLDER_ID: '',
  ARCHIVE_FOLDER_ID: '',
  SPREADSHEET_ID: '',
  DATA_SHEET_NAME: 'DATA',
  EMPLOYEE_COLUMN: 1,
  EMAIL_COLUMN: 2,
  CF_COLUMN: 3,
  EMPLOYEES_EMAIL_STANDARD_OBJECT: `Duale - busta paga ${CURRENT_MONTH} ${CURRENT_YEAR}`,
  EMPLOYEES_EMAIL_STANDARD_TEXT: (name) => {return `Ciao, ${name},
    
    in allegato troverai la tua busta paga per il mese di ${CURRENT_MONTH} ${CURRENT_YEAR}
    
    Questo messaggio è generato in automatico. Per qualsiasi necessità di chiarimento contattare l'amministrazione.`;
    }
}

