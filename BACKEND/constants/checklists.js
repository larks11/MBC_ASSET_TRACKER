const build = (sections) =>
  sections.map(([title, items], i) => ({
    no: i + 1,
    title,
    items: items.map((text, j) => ({ key: `${i + 1}.${j + 1}`, text })),
  }));

// 02F1 — marks: P = OK, O = Not OK, NA = Not applicable. Columns: 1st-4th quarter
export const DESKTOP_CHECKLIST = build([
  ["System", [
    "Check start up errors and speed of entire boot process.",
    "Check log-in process",
  ]],
  ["Network Settings", [
    "Check TCP/IP", "Check Domain name", "Check Computer name",
    "Check Fileserver folder mapping", "Check if unit is connected to the network",
  ]],
  ["Hardware Settings", [
    "Check Hard disk usage", "Check RAM usage", "Check Processor usage",
    "For Laptop: Battery run time is normal",
  ]],
  ["Software", [
    "Check if the required software is installed and operational",
    "Make sure windows, drivers and softwares are up-to-date",
    "Verify proper settings and operation",
    "Clearing of browsing history if necessary",
    "Check Operating System Licensing", "Check Microsoft Office Licensing",
    "Other Software Licensing",
  ]],
  ["Security", [
    "Conduct windows security full scan to check for virus threats",
    "Ensure Windows Security turn on",
    "Clean potentially unwanted files and invalid Windows Registry",
  ]],
  ["General Maintenance", [
    "Remove dust from system unit", "check airflow and fans if working",
    "Perform disk cleanup to remove junk and temporary files",
    "Check thermal paste of CPU and GPU then apply if necessary",
    "Defragment the hard drive", "Clear the Recycle Bin",
    "Remove unused programs", "Clean Peripheral devices",
  ]],
  ["Peripheral Devices", [
    "Mouse working properly", "Keyboard working properly", "Monitor working properly",
    "UPS/AVR working properly", "Printer working properly", "Telephone working properly",
  ]],
]);

// 02F3 — marks: P = OK, O = Not OK. Columns: month 1-12
export const CCTV_CHECKLIST = build([
  ["Surveillance Control Equipment", [
    "Hard Disk are Installed properly and working",
    "Check operation of NVR/DVR cooling fans (if applicable) clean as necessary.",
    "Check time, date stamp is correct and adjust as necessary.",
    "Monitors are free from picture burn-in, distortion, proper contrast and brightness.",
    "All cameras are functioning properly",
    "Check the picture quality of each camera",
    "All operations such as playback, backup and remote view are working",
    "All cameras are recording",
    "DVR/NVR has been configured correctly for remote view.",
    "Remote view of the DVR/NVR is accessible",
    "Check DVR/NR location if it is clean or dust free)",
  ]],
  ["Surveillance Camera & Housing", [
    "Check that the cameras are securely attached to the wall.",
    "Check camera housings for deterioration (environmental conditions).",
    "Clean housing and free from dust",
    "Check lens focus and adjust as appropriate",
    "Check position of view as agreed at installation",
    "Check operation of night vision monitors. (Playback last night recording)",
  ]],
  ["Surveillance Wiring and Cables", [
    "Check connectors and cables entry points for loose wiring.",
    "Check cable are transmitting an adequate video signal to control room.",
    "Check wiring for any wear and tear or exposed wires.",
    "Check power protection device and connections.",
  ]],
]);
