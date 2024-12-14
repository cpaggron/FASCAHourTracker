// Server-side function in Google Apps Script
var sheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1QMh85sTlNSyo_MTeS_DCICKew_F06Ha-kdRdWiLFGhg/edit?gid=1263493696");
var pages = sheet.getSheets();
var memberInfoRaw = sheet.getSheetByName(".Members");
var memberInfo = memberInfoRaw.getDataRange().getValues();
var eventInfoRaw = sheet.getSheets();
var eventInfo = [];

var event_names = [];
var member_names = [];
var member_IDs = [];
var signUp_names = [];
var signUp_IDs = [];

var id_col = 0;
var name_col = 0;

function getEventSheets() {
  // Loop through the sheets and collect the names
  for (var i = 0; i < pages.length; i++) {
    var sheetName = pages[i].getName();
    if (sheetName.charAt(0) == ">") { 
      event_names.push(sheetName.substring(1, sheetName.length));  // Collect sheet names that start with ">"
    }
  }
  
  return event_names;  // Return the array of event names
}

function loadMemberInfo() {
  
  // Iterate over the data and populate member_names and member_IDs arrays
  for (let i = 1; i < memberInfo.length; i++) {
    member_names.push(String(memberInfo[i][0]).trim());  // Column A contains member names
    member_IDs.push(String(memberInfo[i][1]).trim());    // Column B contains member IDs
  }
}

function loadSignUpInfo(eventName) {
  eventInfoRaw = sheet.getSheetByName(eventName);
  eventInfo = eventInfoRaw.getDataRange().getValues();

  // Get data range for ID and name
  for (let i = 0; i < eventInfo[0].length; i++) {
    let currentCell = String(eventInfo[0][i]).trim();
    if (currentCell.includes("ID")) {
      id_col = i;
    } else if (currentCell.includes("name") || currentCell.includes("Name")) {
      name_col = i;
    }
  }

  // Load the data
  for (let i = 0; i < eventInfo.length; i++) {
    signUp_names.push(String(eventInfo[i][name_col]).trim());
    signUp_IDs.push(String(eventInfo[i][id_col]).trim());
  }
}

function logSignInTime(id) {

  // Find the ID column and edit column
  let column = 0;
  let edit_column = 0;
  for (let i = 0; i < eventInfo[0].length; i++) {
    if (eventInfo[0][i].includes("ID")) {
      column = i;
    }
    if (eventInfo[1][i] == "I agree") {
      edit_column = i+2;
    }
  }

  // Find the correct ID and log the hours accordingly
  for (let i = 0; i < eventInfo.length; i++) {
    if (eventInfo[i][column] == id) {

      // google sheets is 1-based index so lastRow+1
      let now = new Date();
      var formattedDate = Utilities.formatDate(now, "PST", "MM-dd-yyyy HH:mm:ss");
      eventInfoRaw.getRange(1, edit_column).setValue("Sign In Time");
      eventInfoRaw.getRange(i+1, edit_column).setValue(formattedDate);
      break;
    }
  }
}

function isSignedIn(id) {
  // Find the ID column and edit column
  let column = 0;
  let edit_column = 0;
  for (let i = 0; i < eventInfo[0].length; i++) {
    if (eventInfo[0][i].includes("ID")) {
      column = i;
    }
    if (eventInfo[1][i] == "I agree") {
      edit_column = i+2;
    }
  }

  // Check if member is already sined in
  for (let i = 0; i < eventInfo.length; i++) {
    if (eventInfo[i][column] == id) {
      let cellValue = eventInfoRaw.getRange(i+1, edit_column).getValue();
      // google sheets is 1-based index so lastRow+1
      if (cellValue == "" || !cellValue || cellValue == undefined) {
        return false;
      }
      return true;
    }
  }
  return true;
}

function signIn(name, id, event) {
  if (!event) {
    return 0;
  }

  loadMemberInfo();
  loadSignUpInfo(">"+event);

  name = String(name).trim();
  id = String(id).trim();
  let correctData = false;

  // Check if member is in FASCA/name spelled correctly
  for (let i = 0; i < member_IDs.length; i++) {

    // If ID matches
    if (member_IDs[i] == id) {

      // Does name match with corresponding ID
      if (member_names[i] == name) {
        correctData = true;
        break;
      } else {
        return 2;
      }
    }
  }

  if (!correctData) {
    return 2;
  }

  // Check if member signed up for event
  for (let i = 0; i < member_IDs.length; i++) {

    // If ID matches
    if (signUp_IDs[i] == id) {

      // Does name match with corresponding ID
      if (signUp_names[i] == name) {
        if (isSignedIn(id)) {
          return 4;
        }
        logSignInTime(id)
        return 1;
      } else {
        return 3;
      }
    }
  }
  return 3;
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('main');
}
