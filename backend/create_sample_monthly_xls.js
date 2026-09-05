const XLSX = require('xlsx');

// Create sample monthly attendance data for multiple employees
const employees = [
    {
        empCode: 'EMP-1001',
        name: 'Buddika',
        designation: 'DEMO',
        present: 22,
        hl: 0,
        wo: 0,
        absent: 0,
        leave: 0,
        paidDays: 22,
        lateHrs: '2:30',
        workHrs: '176:00',
        ovTim: '4:00'
    },
    {
        empCode: 'EMP-1002',
        name: 'John Doe',
        designation: 'DEVELOPER',
        present: 21,
        hl: 0,
        wo: 0,
        absent: 1,
        leave: 0,
        paidDays: 21,
        lateHrs: '1:45',
        workHrs: '168:00',
        ovTim: '3:30'
    },
    {
        empCode: 'EMP-1003',
        name: 'Jane Smith',
        designation: 'DESIGNER',
        present: 22,
        hl: 0,
        wo: 0,
        absent: 0,
        leave: 0,
        paidDays: 22,
        lateHrs: '0:00',
        workHrs: '176:00',
        ovTim: '0:00'
    },
    {
        empCode: 'EMP-1004',
        name: 'Kamal Perera',
        designation: 'MANAGER',
        present: 20,
        hl: 1,
        wo: 0,
        absent: 0,
        leave: 1,
        paidDays: 21,
        lateHrs: '0:30',
        workHrs: '160:00',
        ovTim: '2:00'
    }
];

// Generate daily data for each employee
function generateDailyData(employee, day) {
    const dayNum = day.toString().padStart(2, '0');
    
    // Skip weekends (assuming Saturday=6, Sunday=0)
    const dayOfWeek = new Date(2026, 8, day).getDay(); // September 2026
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return {
            arrivedTime: '',
            deptTime: '',
            workingHrs: '',
            otHrs: '',
            status: 'weekend'
        };
    }
    
    // Simulate some variety in attendance
    const baseArrived = '08:00';
    const baseDept = '17:00';
    const baseWork = '09:00';
    const baseOT = '01:00';
    
    // Add some variation based on employee
    let arrived = baseArrived;
    let dept = baseDept;
    let work = baseWork;
    let ot = baseOT;
    let status = 'present';
    
    if (employee.empCode === 'EMP-1002' && day === 5) {
        // Absent day
        arrived = '';
        dept = '';
        work = '';
        ot = '';
        status = 'absent';
    } else if (employee.empCode === 'EMP-1004' && day === 10) {
        // Half day
        arrived = '08:00';
        dept = '13:00';
        work = '05:00';
        ot = '00:00';
        status = 'half_day';
    } else if (employee.empCode === 'EMP-1004' && day === 15) {
        // Leave
        arrived = '';
        dept = '';
        work = '';
        ot = '';
        status = 'leave';
    } else if (employee.empCode === 'EMP-1001' && day % 5 === 0) {
        // Late arrival
        arrived = '08:30';
        dept = '17:30';
        work = '09:00';
        ot = '01:00';
        status = 'late';
    }
    
    return {
        arrivedTime: arrived,
        deptTime: dept,
        workingHrs: work,
        otHrs: ot,
        status: status
    };
}

// Build the worksheet data
const headers = ['EmpCode', 'Name', 'Designation', 'Present', 'HL', 'WO', 'Absent', 'Leave', 'PaidDays', 'LateHrs', 'WorkHrs', 'OvTim'];

// Add daily columns for all 31 days
for (let day = 1; day <= 31; day++) {
    const dayNum = day.toString().padStart(2, '0');
    headers.push(`Arrived Time_${dayNum}`);
    headers.push(`Dept. Time_${dayNum}`);
    headers.push(`Working Hrs._${dayNum}`);
    headers.push(`O.Times Hrs._${dayNum}`);
    headers.push(`Status_${dayNum}`);
}

const data = [headers];

// Add employee rows
employees.forEach(employee => {
    const row = [
        employee.empCode,
        employee.name,
        employee.designation,
        employee.present,
        employee.hl,
        employee.wo,
        employee.absent,
        employee.leave,
        employee.paidDays,
        employee.lateHrs,
        employee.workHrs,
        employee.ovTim
    ];
    
    // Add daily data
    for (let day = 1; day <= 31; day++) {
        const dailyData = generateDailyData(employee, day);
        row.push(dailyData.arrivedTime);
        row.push(dailyData.deptTime);
        row.push(dailyData.workingHrs);
        row.push(dailyData.otHrs);
        row.push(dailyData.status);
    }
    
    data.push(row);
});

// Create workbook
const worksheet = XLSX.utils.aoa_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Attendance');

// Write file
XLSX.writeFile(workbook, 'sample_monthly_attendance_multiple_employees.xlsx');
console.log('Sample XLS file created: sample_monthly_attendance_multiple_employees.xlsx');
