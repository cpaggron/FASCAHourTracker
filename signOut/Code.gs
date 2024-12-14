// Server-side function in Google Apps Script
var sheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1QMh85sTlNSyo_MTeS_DCICKew_F06Ha-kdRdWiLFGhg/edit?gid=1263493696");
var pages = sheet.getSheets();
var memberInfoRaw = sheet.getSheetByName(".Members");
var memberInfo = memberInfoRaw.getDataRange().getValues();
var auditLog = sheet.getSheetByName(".Audit Log");
var info = sheet.getSheetByName(".Info");
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


function getNextEmptyRow(column) {
  var lastRow = auditLog.getLastRow();  // Get the last row with content
  var range = auditLog.getRange(1, column, lastRow);  // Get the range for that column
  var values = range.getValues();  // Get the values in that range

  // Loop through the values to find the first empty cell
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === "" || values[i][0] === null) {
      return i + 1;  // Return the row number (1-based index)
    }
  }

  // If no empty cell is found, return the row after the last row with content
  return lastRow + 1;
}

function getTotalEvents() {
  let n = 0;
  let now = new Date();
  for (let i = 0; i < pages.length; i++) {
    let date;
    let pageName = pages[i].getName();
    // if is an event
    if (pageName.charAt(0) != ".") {
      if (pageName.charAt(0) == ">") {
        date = String(pageName).substring(1, pageName.length);
      } else {
        date = String(pageName);
      }

      let day_start_index = date.indexOf("/");
      let year_start_index = date.indexOf("/", day_start_index+1);
      let year = (date.substring(year_start_index+1, year_start_index+5));
      let day = Number(date.substring(day_start_index+1, year_start_index));
      let month = Number(date.substring(0, day_start_index));
      date = String(date).substring(0, 10);
      date = date.trim();

      let current_year = now.getFullYear();
      let current_month = now.getMonth() + 1;
      let current_day = now.getDay();

      if (current_year >= year) {
        if (current_year != year) {
          n++;
        } else {
          if (current_month >= month) {
            if (current_month != month) {
              n++;
            } else {
              if (current_day >= day) {
                n++;
              }
            }
          }
        }
      }
    }
  }
  return n;
}

function updateHours(eventName, hourCell, id) {
  let row = 0;
  let column = 0;

  // get the row
  for (let i = 0; i < member_IDs.length; i++) {
    if (String(id) == String(member_IDs[i])) {
      row = i + 2
    }
  }

  // get column
  let month = "";
  let i;
  for (let i = 0; i < eventName.length; i++) {
    if (eventName.charAt(i) == "/") {
      break;
    }
  }
  let firstSlashIndex = eventName.indexOf("/", 0);
  month = eventName.substring(1, firstSlashIndex);
  let hourFormula;
  column = Number(month) + 6;

  let cell = memberInfoRaw.getRange(row, column);
  let cellValue = cell.getFormula();

  if (cellValue === "" || cellValue === undefined || !cellValue || cellValue == 0) {
    hourFormula = `='${eventName}'!${hourCell}`;
  } else {
    hourFormula = `${String(cellValue)}+('${eventName}'!${hourCell})`;
  }

  cell.setValue(hourFormula);

  // Update number of attended events
  let hours = eventInfoRaw.getRange(hourCell).getValue();
  let attendence_cell = memberInfoRaw.getRange(row, 5);
  if (Number(hours) >= 1) {
    attendence_cell.setValue(Number(attendence_cell.getValue()) + 1);
  }
}

function logSignOutTime(eventName, id) {

  // Find the ID column
  let column = 0;
  let edit_column = 0;
  let total_hours_column = 0;
  let final_hours_column = 0;

  let audit_log_row = 0;
  let audit_log_column = 0;

  // Get edit column cell
  for (let i = 0; i < eventInfo[0].length; i++) {
    if (eventInfo[0][i].includes("ID")) {
      column = i;
    }
    if (eventInfo[1][i] == "I agree") {
      edit_column = i+3;
      total_hours_column = edit_column + 1;
      final_hours_column = edit_column + 2;
    }
  }

  // Get audit log edit cell column
  for (let i = 0; i < member_IDs.length; i++) {
    if (String(id) == String(member_IDs[i])) {
      audit_log_column = i + 2;
      break;
    }
  }


  // Get audit log edit cell row
  audit_log_row = getNextEmptyRow(audit_log_column);

  // Find the correct ID and log the hours accordingly
  for (let i = 0; i < eventInfo.length; i++) {
    if (eventInfo[i][column] == id) {

      // google sheets is 1-based index so lastRow+1
      let now = new Date();
      let formattedDate = Utilities.formatDate(now, "PST", "MM-dd-yyyy HH:mm:ss");
      let sign_in_cell = eventInfoRaw.getRange(i+1, edit_column-1)
      let sign_out_cell = eventInfoRaw.getRange(i+1, edit_column);
      let total_hours_cell = eventInfoRaw.getRange(i+1, total_hours_column);
      let final_hours_cell = eventInfoRaw.getRange(i+1, final_hours_column);

      eventInfoRaw.getRange(1, edit_column).setValue("Sign Out Time");
      eventInfoRaw.getRange(1, total_hours_column).setValue("H:MM");
      eventInfoRaw.getRange(1, final_hours_column).setValue("Final Hours");

      // note sign out time
      sign_out_cell.setValue(formattedDate);

      // get total hours volunteered (sign out time minus sign in time)
      total_hours_cell.setValue(`=TEXT(${sign_out_cell.getA1Notation()}-${sign_in_cell.getA1Notation()}, "h:mm")`);

      // calculate final hours
      final_hours_cell.setValue(`=ROUNDDOWN((HOUR(${total_hours_cell.getA1Notation()})+MINUTE(${total_hours_cell.getA1Notation()})/60)*4)/4`);

      // note hour update in audit log
      let final_hours_cell_A1 = final_hours_cell.getA1Notation();
      auditLog.getRange(audit_log_row, audit_log_column).setValue(`='${eventName}'!${final_hours_cell_A1}&" hours\n${eventName.substring(1, eventName.length)}\n${formattedDate}"`);

      // update amount of total events
      info.getRange(2, 2).setValue(getTotalEvents());

      // update member hours and number of attended events
      updateHours(eventName, final_hours_cell_A1, id);
      break;
    }
  }
}

function isSignedOut(id) {
  // Find the ID column and edit column
  let column = 0;
  let edit_column = 0;
  for (let i = 0; i < eventInfo[0].length; i++) {
    if (eventInfo[0][i].includes("ID")) {
      column = i;
    }
    if (eventInfo[1][i] == "I agree") {
      edit_column = i+3;
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

function notSignedIn(id) {
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
        return true;
      }
      return false;
    }
  }
  return true;
}

function signOut(name, id, event) {
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
        if (isSignedOut(id)) {
          return 4;
        }
        if (notSignedIn(id)) {
          return 5;
        }
        logSignOutTime(">"+event, id)
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
