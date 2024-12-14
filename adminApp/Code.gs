var sheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1QMh85sTlNSyo_MTeS_DCICKew_F06Ha-kdRdWiLFGhg/edit?gid=1263493696");
var pages = sheet.getSheets();
var infoSheet = sheet.getSheetByName(".Info");
var otherHourSheet = sheet.getSheetByName(".Other Reported Hours");
var memberInfoRaw = sheet.getSheetByName(".Members");
var memberInfo = memberInfoRaw.getDataRange().getValues();
var auditLog = sheet.getSheetByName(".Audit Log");
var forms = sheet.getResp

var member_names = [];
var member_IDs = [];
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

var eventInfoRaw;
var eventInfo;

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
  infoSheet.getRange("B2").setValue(n);
}

function reset() {
  clearReportedHours();
  clearTotalHours();
  clearAuditLog();
  clearRoster();
  clearEvents();
}

function clearReportedHours() {
  let row = otherHourSheet.getLastRow() - 1;
  if (row >= 1) {
    let range = otherHourSheet.getRange(2, 1, row, 6);
    range.clear();
  }
}

function clearTotalHours() {
  let row = memberInfoRaw.getLastRow() - 1;
  if (row >= 1) {
    let range = memberInfoRaw.getRange(2, 5, row, 15);
    range.clear();
  }
}

function clearAuditLog() {
  let column = memberInfoRaw.getLastRow() - 1;
  let row = auditLog.getLastRow() - 1;
  if (row >= 1) {
    let range = auditLog.getRange(3, 2, row, column);
    range.clear();
  }
}

function clearRoster() {
  let row = memberInfoRaw.getLastRow() - 1;
  if (row >= 1) {
    let range = memberInfoRaw.getRange(2, 1, row, 2);
    range.clear();
  }
}

function clearEvents() {
  infoSheet.getRange("B2").clear();
  let sheets = sheet.getSheets();
  
  for (let page of sheets) {
    let name = page.getName();
    if (name.charAt(0) !== ".") {
      try {
        let f = DriveApp.getFilesByName(name).next();
        FormApp.openById(f.getId()).removeDestination();
      } catch(e) {}
      sheet.deleteSheet(sheet.getSheetByName(name));
    }
  }
}

function login(password) {
  if (infoSheet.getRange("A2").getValue() == password) {
    return true;
  }
  return false;
}

function loadMemberInfo() {
  
  // Iterate over the data and populate member_names and member_IDs arrays
  for (let i = 1; i < memberInfo.length; i++) {
    member_names.push(String(memberInfo[i][0]).trim());  // Column A contains member names
    member_IDs.push(String(memberInfo[i][1]).trim());    // Column B contains member IDs
  }
}

function checkMemberInfo(name, id) {
  loadMemberInfo();
  if (!name || !id) {
    return false;
  }
  for (let i = 0; i < member_IDs.length; i++) {
    // If ID matches
    if (member_IDs[i] == id) {

      // Does name match with corresponding ID
      if (member_names[i] == name) {
        return true;
      } else {
        return false;
      }
    }
  }
  return false;
}

function recalculateHours(id) {
  loadMemberInfo();
  let sheets = sheet.getSheets();
  let member_row = getMemberRow(id);
  Logger.log(memberInfoRaw.getRange(member_row, 2).getValue());
  try {
    Logger.log(memberInfoRaw.getRange(member_row, 2).getValue());
  } catch(e) {
    Logger.log(e.message);
    return false;
  }
  let edit_range = memberInfoRaw.getRange(member_row, 5, 1, 14);

  let member_hours = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (let page of sheets) {
    let name = page.getName();
    loadSignUpInfo(name);

    // outside and other hours
    if (name == ".Other Reported Hours") {

      for (let i = 2; i <= otherHourSheet.getLastRow(); i++) {
        if (String(otherHourSheet.getRange(i, 1).getValue()) == String(id)) {
          if (!otherHourSheet.getRange(i, 4).getValue()) {
            let month = months.indexOf(otherHourSheet.getRange(i, 5).getValue());
            member_hours[month + 2] += otherHourSheet.getRange(i, 3).getValue();
          } else {
            member_hours[1] += otherHourSheet.getRange(i, 3).getValue();
          }
        }
      }
    }

    // Event hours
    if (name.charAt(0) !== ".") {
       // Find the ID column
      let column = 0;
      let final_hours_column = 0;

      // Get edit column cell
      for (let i = 0; i < eventInfo[0].length; i++) {
        if (eventInfo[0][i].includes("ID")) {
          column = i;
        }
        if (String(eventInfo[0][i]).toLowerCase() == "final hours") {
          final_hours_column = i + 1;
        }
      }

      if (final_hours_column == 0) {
        break;
      }

      // see if member is in the event
      for (let i = 0; i < eventInfoRaw.getLastRow(); i++) {
        if (String(eventInfo[i][column]) == String(id)) {
          // get month of event
          let month = "";
          for (let i = 0; i < name.length; i++) {
            if (name.charAt(i) == "/") {
              break;
            }
          }
          let firstSlashIndex = name.indexOf("/", 0);
          let index = 0;
          if (name.charAt(0) == ">") {
            index = 1;
          }
          month = Number(name.substring(index, firstSlashIndex));

          // update hours
          let hours = eventInfoRaw.getRange(i+1, final_hours_column).getValue();
          if (hours >= 1) {
            member_hours[0]++;
          }
          member_hours[month + 1] += hours;
          break;
        }
      }
      
    }
  }
  // Update main hours sheet
  edit_range.setValues([member_hours]);
  return true;
}

function getMemberRow(id) {
  // get the row
  for (let i = 0; i < member_IDs.length; i++) {
    if (String(id) == String(member_IDs[i])) {
      return i + 2;
    }
  }
  return null;
}

function loadSignUpInfo(eventName) {
  eventInfoRaw = sheet.getSheetByName(eventName);
  eventInfo = eventInfoRaw.getDataRange().getValues();

}

function getNextEmptyRowAuditLog(column) {
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

function getAuditLogColumn(id) {
  // get the column
  for (let i = 0; i < member_IDs.length; i++) {
    if (String(id) == String(member_IDs[i])) {
      return i + 2;
    }
  }
  return null;
}

function reportHours(name, id, hours, reason, month, reportingOutsideHours) {
  // If member info correct
  if (checkMemberInfo(name, id)) {
    let row = otherHourSheet.getLastRow() + 1;
    let range = otherHourSheet.getRange(row, 1, 1, 6);
    let hourCell = otherHourSheet.getRange(row, 3).getA1Notation();
    let cell;
    let hourFormula;
    month = Number(month);

    // Report the hours being added
    range.setValues([[id, name, hours, reportingOutsideHours, months[month-1], reason]]);
    
    // Get the outside hour cell
    if (reportingOutsideHours) {
      cell = memberInfoRaw.getRange(getMemberRow(id), 6);
    } 
    // Get the not outside hour cell
    else {
      cell = memberInfoRaw.getRange(getMemberRow(id), month + 6);
    }

    // Add the hours
    let cellValue = cell.getFormula();

    if (cellValue === "" || cellValue === undefined || !cellValue || cellValue == 0) {
      hourFormula = `='.Other Reported Hours'!${hourCell}`;
    } else {
      hourFormula = `${String(cellValue)}+('.Other Reported Hours'!${hourCell})`;
    }

    cell.setValue(hourFormula);

    // Update the audit log
    let audit_column = getAuditLogColumn(id);
    let now = new Date();
    let formattedDate = Utilities.formatDate(now, "PST", "MM-dd-yyyy HH:mm:ss");
    let audit_reason = reportingOutsideHours ? "Outside Hours" : reason;

    audit_cell = auditLog.getRange(getNextEmptyRowAuditLog(audit_column), audit_column);
    audit_cell.setValue(`${hours} hours\n${audit_reason}\n${formattedDate}`);

    return true;

  } 
  // If member info incorrect
  else {
    return false;
  }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('main');
}
