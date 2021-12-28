const SPREADSHEET_ID = '';
const XML_FOLDER_ID = '';

const PRIVATE_INFO = [SPREADSHEET_ID, XML_FOLDER_ID];

//
//
//
//
// PRIVATE INFO ABOVE THIS POINT
//
//
//
//

// This file has been structured using the info at https://babons.it/sct-tracciato-flusso/

// CONSIDER THE FOLLOWING:
// Some variables have messy names. This is to be consistent with the xml fields.
// Code mixes Italian and English so the banking vocabulary is easier to deal with. I apologise.

if(PRIVATE_INFO.any( data => data === '' || data === undefined)) {
  throw Error('Did you forget to fill in private info?');
}


const SPREADSHEET = SpreadsheetApp.openById(SPREADSHEET_ID);

const DATI_AZIENDA_SHEET_NAME = 'Dati Azienda';
const EFFETTI_DA_PAGARE_SHEET_NAME = 'Effetti da pagare';
const GENERAZIONE_DISTINTA_SHEET_NAME = 'Generazione distinta';

const DATI_AZIENDA_SHEET = SPREADSHEET.getSheetByName(DATI_AZIENDA_SHEET_NAME);
const EFFETTI_DA_PAGARE_SHEET = SPREADSHEET.getSheetByName(EFFETTI_DA_PAGARE_SHEET_NAME);
const GENERAZIONE_DISTINTA_SHEET = SPREADSHEET.getSheetByName(GENERAZIONE_DISTINTA_SHEET_NAME);

const DATI_AZIENDA_SHEET_DATA = DATI_AZIENDA_SHEET.getRange(1, 1, DATI_AZIENDA_SHEET.getLastRow(), DATI_AZIENDA_SHEET.getLastColumn()).getValues();
const GENERAZIONE_DISTINTA_SHEET_DATA = GENERAZIONE_DISTINTA_SHEET.getRange(1, 1, GENERAZIONE_DISTINTA_SHEET.getLastRow(), GENERAZIONE_DISTINTA_SHEET.getLastColumn()).getValues();
let EFFETTI_DA_PAGARE_SHEET_DATA;

// This requires a try because the sheet could be empty and getValues() throws if there are no rows to select.
try {
  EFFETTI_DA_PAGARE_SHEET_DATA = EFFETTI_DA_PAGARE_SHEET.getRange(2, 1, EFFETTI_DA_PAGARE_SHEET.getLastRow(), EFFETTI_DA_PAGARE_SHEET.getLastColumn()).getValues();
} catch(e) {
  Logger.log(e);
}

const DATI_AZIENDA = {
  denominazione: DATI_AZIENDA_SHEET_DATA[0][1],
  cuc: DATI_AZIENDA_SHEET_DATA[1][1],
  iban: DATI_AZIENDA_SHEET_DATA[2][1],
  abi: DATI_AZIENDA_SHEET_DATA[3][1]
}

const GENERAZIONE_DISTINTA_CONFIG = {
  dataEsecuzione: GENERAZIONE_DISTINTA_SHEET_DATA[0][1],
}



function test() {
  createXML();
}




function clearEffettiSheet() {
  // This part unchecks every checkbox in the first column
  const lastRow = EFFETTI_DA_PAGARE_SHEET.getLastRow();
  for(let i = 2; i <= lastRow; i++) {
    EFFETTI_DA_PAGARE_SHEET.getRange(i, 1).setValue('FALSE');
  }

  // These clear the table
  const range = EFFETTI_DA_PAGARE_SHEET.getRange(2, 2, EFFETTI_DA_PAGARE_SHEET.getLastRow(), EFFETTI_DA_PAGARE_SHEET.getLastColumn());
  range.clearContent();
}

function getListaEffetti() {
  // row[0] is the checkbox cell, json stringify is to get a deep copy of the object
  const table = EFFETTI_DA_PAGARE_SHEET_DATA.filter( row => row[0]).map( obj => JSON.parse(JSON.stringify(obj)));

  // Get rid of checkbox entry
  table.forEach( row => {
    row.splice(0, 1);
  });

  const effetti = table.map( row => {
    return {
      data: row[0],
      nDoc: row[1],
      denominazione: row[2],
      importo: row[3],
      pIva: row[4],
      iban: row[6]
    }
  });

  return effetti;
}

function getGroupedEffetti(listaEffetti) {
  // listaEffetti is an array of objects with this structure:
  /*{
      data: row[0],
      nDoc: row[1],
      denominazione: row[2],
      importo: row[3],
      pIva: row[4],
      iban: row[6]
    }*/

  const pIvaProcessed = [];
  const groupedEffetti = [];

  listaEffetti.forEach( effetto => {
    const currentPIva = effetto.pIva;
    if(!pIvaProcessed.includes(currentPIva)) {
      let allEffettiForThisPIva = listaEffetti.filter( effetto => effetto.pIva === currentPIva);
      pIvaProcessed.push(currentPIva);
      groupedEffetti.push(allEffettiForThisPIva);
    }
  });

  return groupedEffetti;
}




function getWholeXMLString() {
  // This function is a bit of a mess.
  // But basically it just grabs the data as fetched from the spreadsheet, and puts
  // strings together to get to the final xml


  let nextInstrId = 1; // Progressivo disposizioni
  const groupedEffetti = getGroupedEffetti(getListaEffetti());
  const uniqueMsgID = `DistintaXML-${new Date().toISOString()}`;

  const getDisposizioneObject = (effettiArray) => {    
    // In <CdtTrfTxInf>
    // Contiene il dettaglio delle singole disposizioni facenti parte della distinta;

    const InstAmt = effettiArray.reduce( (acc, currentValue) => acc + currentValue.importo, 0);
    const Cdtr = effettiArray[0].denominazione;
    const CdtrAcct = effettiArray[0].iban;
    // This reducer just inserts a text reference for every item to process
    const RmtInf = effettiArray.reduce( (acc, currentItem) => acc + ` Vs doc. ${currentItem.nDoc} del ${currentItem.data} `, '' );


    return {
      InstrId: nextInstrId++, // Progressivo disposizione <InstrId> [Max35Text]
      // Identificativo univoco, a livello di distinta, assegnato all’istruzione dal Mittente nei confronti della sua Banca; si consiglia di utilizzare una numerazione sequenziale (1,2,3,…): la prima disposizione sarà quindi caratterizzata dal valore 1, la seconda dal valore 2, la terza dal valore 3, …
      EndToEndId: 'DISTINTAXML' + (new Date().toISOString()), //Identificativo end-to-end <EndToEndId> [Max35Text]
      // Identificativo URI assegnato dal Mittente e che identifica la singola disposizione di pagamento per tutta la catena di pagamento fino al beneficiario.
      CtgyPurp: 'SUPP', // Causale bancaria (category purpose) <PmtTpInf> <CtgyPurp> <Cd> [4Text]
      // Identifica la causale interbancaria, basata su un set predefinito di categorie; obbligatorio se IBAN c/c di accredito riferito ad IT.
      // Utilizzare “SUPP” per bonifici generici, “SALA” per stipendi, “INTC” per giroconti/girofondi;
      // La lista completa dei codici è disponibile all’indirizzo:
      // http://www.iso20022.org/external_code_list.page (“External Code Lists spreadsheet” foglio “4 CategoryPurpose”).
      InstAmt: InstAmt, // Divisa e importo <Amt> <InstdAmt> [ActiveOrHistoricCurrencyAndAmount]
      // E’ consentito indicare come divisa solo EUR, l’importo deve essere compreso tra 0.01 e 999999999.99; la parte decimale deve essere max di 2 cifre ma può essere anche assente; come separatore decimale deve essere utilizzato il punto.
      Cdtr: Cdtr, // Nome del beneficiario <Cdtr> <Nm> [Max35Text]
      //Nome del titolare del conto corrente di accredito.
      CdtrAcct: CdtrAcct, //IBAN conto del creditore <CdtrAcct> <Id> <IBAN> [IBAN2007Identifier]
      RmtInf: RmtInf // Informazioni/Causale <RmtInf> <Ustrd> [Max140Text]
      // Informazioni sul pagamento comunicate dall’ordinante al beneficiario (Remittance Information); ad esempio “Pagamento fattura 10 del 13/03/12”, “Stipendio mese di gennaio”.
    };
  }

  const allDisposizioni = groupedEffetti.map( effetti => getDisposizioneObject(effetti));
  const totalAmountForGroupedEffetti = groupedEffetti.reduce( (total, currentList) => {
    let amount = currentList.reduce( (total, currentItem) => total + currentItem.importo, 0);
    return total + amount;
  }, 0);
  const totalAmountForAllDisposizioni = allDisposizioni.reduce( (total, currentValue) => total + currentValue.InstAmt, 0);

  if(totalAmountForAllDisposizioni != totalAmountForGroupedEffetti) {
    throw Error('total amounts do not match');
  }



  // Helper functions to populate the template
  // They just put the data together and return a template string for the xml

  const getGrpHdrString = () => {
    
    // In <GrpHdr>
    // Identificativo univoco messaggio <MsgId> [Max35Text]
    const MsgId = uniqueMsgID; 
    // Data e Ora di Creazione <CreDtTm> [ISO DateTime, es. “2014-02-05T18:19:00+01:00”]
    const CreDtTm = new Date().toISOString(); 
    // Numero transazioni incluse nella distinta <NbOfTxs> [Max15NumericText]
    const NbOfTxs = allDisposizioni.length;
    // Totale importi delle transazioni incluse nelle distinta <CtrlSum> [DecimalNumber es “180.51”].
    // L’importo deve essere compreso tra 0.01 e 999999999999999.99; la parte decimale deve essere max di 2 cifre ma può essere anche assente; come separatore decimale deve essere utilizzato il punto.
    const CtrlSum = totalAmountForAllDisposizioni; 
    // Nome azienda mittente <InitgPty><Nm> [Max70Text]
    const InitPty = DATI_AZIENDA.denominazione;
    // Codice CUC azienda mittente <OrgId><Othr><Id> [8Text]
    const CUCId = DATI_AZIENDA.cuc;

    return `<GrpHdr>
    <MsgId>
      ${MsgId}
    </MsgId>
    <CreDtTm>
      ${CreDtTm}
    </CreDtTm>
    <NbOfTxs>
      ${NbOfTxs}
    </NbOfTxs>
    <CtrlSum>
      ${CtrlSum}
    </CtrlSum>
    <InitgPty>
      <Nm>
      ${InitPty}
      </Nm>
      <Id>
        <OrgId>
          <Othr>
            <Id>
              ${CUCId}
            </Id>
            <Issr>
              CBI
            </Issr>
          </Othr>
        </OrgId>
      </Id>
    </InitgPty>
    </GrpHdr>`;
  }
  const getPmtInfString = () => {
    // In <PmtInf>
    // Contiene informazioni contabili comuni a tutta la distinta e relative al debitore;  al suo interno è necessario valorizzare i seguenti campi:
    // Identificativo informazioni di addebito <PmtInfId> [Max35Text]
    const PmtInfId = uniqueMsgID; 
    // Richiesta esito <PmtMtd> con TRA sì esito, con TRF no esito;
    const PmtMtd = 'TRA'; 
    // Modalità di Esecuzione <BtchBookg>true</BtchBookg>
    // con “true” esecuzione multipla (1 addebito e tanti accrediti) oppure “false” (tanti addebiti e tanti accrediti) 
    const BtchBookg = true; 
    // Modalità di Esecuzione <InstrPrty>  con NORM avviene l’esecuzione normale, con HIGH abbiamo il bonifico urgente eseguito con la stessa data contabile e valuta dell’addebito
    const InstrPrty = 'NORM'; 
    // Data di esecuzione richiesta <ReqdExctnDt> [ISODate, es. “2014-02-14”]
    const ReqdExctnDt = ''; 
    // Nome azienda ordinante <Dbtr> <Nm> [Max70Text]
    const Dbtr = DATI_AZIENDA.denominazione; 
    // IBAN conto di addebito <DbtrAcct> <Id> <IBAN> [IBAN2007Identifier]
    const DbtrAcct = DATI_AZIENDA.iban;
    //  Abi Banca debitore <DbtrAgt> <FinInstnId> <ClrSysMmbId> <MmbId> [Max5Text]
    const DbtrAgt = DATI_AZIENDA.abi;


    return `<PmtInf>
        <PmtInfId>${PmtInfId}</PmtInfId>
        <PmtMtd>${PmtMtd}</PmtMtd>
        <BtchBookg>${BtchBookg}</BtchBookg>
        <PmtTpInf>
        <InstrPrty>${InstrPrty}</InstrPrty>
        <SvcLvl>
            <Cd>SEPA</Cd>
        </SvcLvl>
        </PmtTpInf>
        <ReqdExctnDt>${ReqdExctnDt}</ReqdExctnDt>
        <Dbtr>
            <Nm>${Dbtr}</Nm>
        </Dbtr>
        <DbtrAcct>
            <Id>
                <IBAN>${DbtrAcct}</IBAN>
            </Id>
        </DbtrAcct>
        <DbtrAgt>
            <FinInstnId>
                <ClrSysMmbId>
                    <MmbId>${DbtrAgt}</MmbId>
                </ClrSysMmbId>
            </FinInstnId>
        </DbtrAgt>
    <ChrgBr>SLEV</ChrgBr>`;
  }
  const getAggregateCdtTrfTxInf = () => {
    let wholeSection = '';

    allDisposizioni.forEach( disposizione => {
      wholeSection += `<CdtTrfTxInf>
          <PmtId>
              <InstrId>${disposizione.InstrId}</InstrId>
              <EndToEndId>${disposizione.EndToEndId}</EndToEndId>
          </PmtId>
          <PmtTpInf>
              <CtgyPurp>
                  <Cd>${disposizione.CtgyPurp}</Cd>
              </CtgyPurp>        
          </PmtTpInf>
          <Amt>
              <InstdAmt Ccy=”EUR”>${disposizione.InstAmt}</InstdAmt>
          </Amt>
          <Cdtr>
              <Nm>${disposizione.Cdtr}</Nm>
          </Cdtr>
          <CdtrAcct>
              <Id>
                  <IBAN>${disposizione.CdtrAcct}</IBAN>
              </Id>
          </CdtrAcct>
          <RmtInf>
              <Ustrd>${disposizione.RmtInf}</Ustrd>
          </RmtInf>
      </CdtTrfTxInf>`;
    });

    return wholeSection;
  }
  //
  //  HELPER FUNCTIONS END
  //


  //
  // XML template parts construction
  //

  // File header, one time at the top
  const cbiHeader = `<?xml version=”1.0″ encoding=”utf-8″?>
  <CBIPaymentRequest xmlns=”urn:CBI:xsd:CBIPaymentRequest.00.04.00″>`;

  // <GrpHdr>
  const grpHdr = getGrpHdrString();

  // <PmtInf>
  const pmtInf = getPmtInfString();

  // <CdtTrfTxInf>
  const cdtTrfTxInf = getAggregateCdtTrfTxInf();

  const cbiFooter = `</PmtInf>
  </CBIPaymentRequest>`;

  // Put everything together and return the xml string
  const xmlContent = cbiHeader + grpHdr + pmtInf + cdtTrfTxInf + cbiFooter;

  return xmlContent;
}





function createXML() {
  // This function creates a google doc with the xml data in it.
  // It is not a proper XML output yet, but it's good enough for the time being

  const fileName = `XML bonifici pagamento ${new Date().toString().slice(0,24)}`;
  const content = getWholeXMLString();

  // This API is kinda tricky and apparently there are many ways to do this. It depends on V2, V3 of the Drive API
  // Couldn't really map everything out in the reference, but this works.
  const newFile = Drive.Files.insert({mimeType: MimeType.GOOGLE_DOCS, title: fileName, parents: [{id: XML_FOLDER_ID}]});

  // This is a mouthful, but it just opens the document and appends the content
  DocumentApp.openById(newFile.getId()).getBody().appendParagraph(content);

  Logger.log('XML created');
};