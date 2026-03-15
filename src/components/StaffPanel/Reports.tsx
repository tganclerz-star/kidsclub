import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  CalendarDays,
  CalendarRange,
  Users,
  LogIn,
  LogOut,
  AlertTriangle,
  BarChart3,
  FileDown,
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getAllVisits } from '../../lib/db';
import { Visit } from '../../types';

interface Activity {
  id: string;
  name: string;
  price: number;
  color: string;
  date: string;
  createdBy: string;
  assignedKids: { visitId: string; childName: string; time: string }[];
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export default function Reports() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const [dailyDate, setDailyDate] = useState(today);
  const [weekDate, setWeekDate] = useState(today);
  const [monthDate, setMonthDate] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    Promise.all([
      getAllVisits(),
      getDocs(collection(db, 'kc_activities')).then(snap =>
        snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity))
      ),
    ]).then(([v, a]) => {
      setVisits(v);
      setActivities(a);
      setLoading(false);
    });
  }, []);

  function getFilteredVisits(period: ReportPeriod): Visit[] {
    return visits.filter(v => {
      if (!v.date) return false;
      const visitDate = parseISO(v.date);

      if (period === 'daily') {
        return v.date === dailyDate;
      }

      if (period === 'weekly') {
        const ref = parseISO(weekDate);
        const start = startOfWeek(ref, { weekStartsOn: 1 });
        const end = endOfWeek(ref, { weekStartsOn: 1 });
        return isWithinInterval(visitDate, { start, end });
      }

      if (period === 'monthly') {
        const ref = parseISO(monthDate + '-01');
        const start = startOfMonth(ref);
        const end = endOfMonth(ref);
        return isWithinInterval(visitDate, { start, end });
      }

      return false;
    });
  }

  function getFilteredActivities(period: ReportPeriod): Activity[] {
    return activities.filter(a => {
      if (!a.date) return false;
      const actDate = parseISO(a.date);

      if (period === 'daily') return a.date === dailyDate;

      if (period === 'weekly') {
        const ref = parseISO(weekDate);
        const start = startOfWeek(ref, { weekStartsOn: 1 });
        const end = endOfWeek(ref, { weekStartsOn: 1 });
        return isWithinInterval(actDate, { start, end });
      }

      if (period === 'monthly') {
        const ref = parseISO(monthDate + '-01');
        const start = startOfMonth(ref);
        const end = endOfMonth(ref);
        return isWithinInterval(actDate, { start, end });
      }

      return false;
    });
  }

  function getStats(period: ReportPeriod) {
    const filtered = getFilteredVisits(period);
    const filteredActivities = getFilteredActivities(period);
    const activityRevenue = filteredActivities.reduce((sum, a) => sum + a.price * a.assignedKids.length, 0);
    const activityKids = filteredActivities.reduce((sum, a) => sum + a.assignedKids.length, 0);
    return {
      total: filtered.length,
      checkedIn: filtered.filter(v => v.status === 'checked-in').length,
      checkedOut: filtered.filter(v => v.status === 'checked-out').length,
      allergies: filtered.filter(v => v.allergies && v.allergies !== 'N/A' && v.allergies.trim() !== '').length,
      activitiesCount: filteredActivities.length,
      activityKids,
      activityRevenue,
      activities: filteredActivities,
    };
  }

  const [activePeriod, setActivePeriod] = useState<ReportPeriod>('daily');

  const quickStats = useMemo(() => getStats(activePeriod), [visits, activePeriod, dailyDate, weekDate, monthDate]);

  function buildCSV(filtered: Visit[]): string {
    const headers = [
      'Date',
      'Child Name',
      'Parent Name',
      'Room',
      'Guest Type',
      'Session',
      'Status',
      'Check In Time',
      'Check In By',
      'Check Out Time',
      'Check Out By',
      'Pickup Method',
      'Allergies',
      'Staff Notes',
    ];

    const rows = filtered.map(v => [
      v.date,
      v.childName,
      v.parentName,
      v.roomNumber,
      v.guestType,
      v.session,
      v.status,
      v.checkInTime || '',
      v.checkInBy || '',
      v.checkOutTime || '',
      v.checkOutBy || '',
      v.pickupMethod,
      v.allergies || '',
      v.staffNotes || '',
    ]);

    const escape = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const lines = [headers, ...rows].map(row => row.map(escape).join(','));
    return lines.join('\n');
  }

  function buildActivityCSV(filteredActivities: Activity[]): string {
    const headers = ['Date', 'Activity Name', 'Price (AED)', 'Color', 'Created By', 'Kid Name', 'Time Assigned'];
    const rows: string[][] = [];
    filteredActivities.forEach(a => {
      if (a.assignedKids.length === 0) {
        rows.push([a.date, a.name, String(a.price), a.color, a.createdBy, '', '']);
      } else {
        a.assignedKids.forEach(k => {
          rows.push([a.date, a.name, String(a.price), a.color, a.createdBy, k.childName, k.time]);
        });
      }
    });

    const escape = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    return [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
  }

  function downloadCSV(period: ReportPeriod) {
    const filtered = getFilteredVisits(period);
    const filteredAct = getFilteredActivities(period);
    if (filtered.length === 0 && filteredAct.length === 0) return;

    let filename = 'report';
    if (period === 'daily') filename = `kids-club-daily-${dailyDate}.csv`;
    if (period === 'weekly') filename = `kids-club-weekly-${weekDate}.csv`;
    if (period === 'monthly') filename = `kids-club-monthly-${monthDate}.csv`;

    let csvContent = buildCSV(filtered);

    // Append activities section
    if (filteredAct.length > 0) {
      csvContent += '\n\n--- ACTIVITIES ---\n';
      csvContent += buildActivityCSV(filteredAct);
      const totalRev = filteredAct.reduce((s, a) => s + a.price * a.assignedKids.length, 0);
      csvContent += `\n\nTotal Activity Revenue,${totalRev} AED`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF(period: ReportPeriod) {
    const filtered = getFilteredVisits(period);
    if (filtered.length === 0) return;

    const stats = getStats(period);
    let title = 'Kids Club Report';
    let dateRange = '';
    let filename = 'report.pdf';

    if (period === 'daily') {
      dateRange = format(parseISO(dailyDate), 'MMMM d, yyyy');
      title = 'Daily Report';
      filename = `kids-club-daily-${dailyDate}.pdf`;
    } else if (period === 'weekly') {
      const start = startOfWeek(parseISO(weekDate), { weekStartsOn: 1 });
      const end = endOfWeek(parseISO(weekDate), { weekStartsOn: 1 });
      dateRange = `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
      title = 'Weekly Report';
      filename = `kids-club-weekly-${weekDate}.pdf`;
    } else {
      dateRange = format(parseISO(monthDate + '-01'), 'MMMM yyyy');
      title = 'Monthly Report';
      filename = `kids-club-monthly-${monthDate}.pdf`;
    }

    const doc = new jsPDF({ orientation: 'landscape' });

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Kids Club — ${title}`, 14, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(dateRange, 14, 26);

    // Stats summary
    const filteredAct = getFilteredActivities(period);
    const actRevenue = filteredAct.reduce((s, a) => s + a.price * a.assignedKids.length, 0);
    const actKids = filteredAct.reduce((s, a) => s + a.assignedKids.length, 0);

    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(
      `Total: ${stats.total}   |   Checked In: ${stats.checkedIn}   |   Checked Out: ${stats.checkedOut}   |   Allergies: ${stats.allergies}   |   Activities: ${filteredAct.length}   |   Revenue: ${actRevenue} AED`,
      14, 34
    );

    // Visits table
    autoTable(doc, {
      startY: 40,
      head: [[
        'Date', 'Child', 'Parent', 'Room', 'Type', 'Session',
        'Status', 'In Time', 'In By', 'Out Time', 'Out By',
        'Pickup', 'Allergies', 'Notes',
      ]],
      body: filtered.map(v => [
        v.date,
        v.childName,
        v.parentName,
        v.roomNumber,
        v.guestType,
        v.session,
        v.status,
        v.checkInTime || '—',
        v.checkInBy || '—',
        v.checkOutTime || '—',
        v.checkOutBy || '—',
        v.pickupMethod,
        v.allergies || '—',
        v.staffNotes || '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [26, 26, 26], fontSize: 7.5, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 245, 240] },
      margin: { left: 14, right: 14 },
    });

    // Activities table (if any)
    if (filteredAct.length > 0) {
      const lastY = (doc as any).lastAutoTable?.finalY || 60;
      const actStartY = lastY + 12;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26);
      doc.text('Activities', 14, actStartY);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(
        `${filteredAct.length} activities  ·  ${actKids} kids assigned  ·  Total revenue: ${actRevenue} AED`,
        14, actStartY + 7
      );

      const actRows: string[][] = [];
      filteredAct.forEach(a => {
        if (a.assignedKids.length === 0) {
          actRows.push([a.date, a.name, `${a.price} AED`, '—', '—', a.createdBy]);
        } else {
          a.assignedKids.forEach((k, i) => {
            actRows.push([
              i === 0 ? a.date : '',
              i === 0 ? a.name : '',
              i === 0 ? `${a.price} AED` : '',
              k.childName,
              k.time,
              i === 0 ? a.createdBy : '',
            ]);
          });
          // Subtotal row
          actRows.push(['', '', '', '', `Subtotal: ${a.price * a.assignedKids.length} AED`, '']);
        }
      });

      autoTable(doc, {
        startY: actStartY + 11,
        head: [['Date', 'Activity', 'Price/Kid', 'Child', 'Time', 'Created By']],
        body: actRows,
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [194, 154, 60], fontSize: 7.5, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 251, 240] },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160);
      doc.text(
        `Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')} — Page ${i} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 8
      );
    }

    doc.save(filename);
  }

  const periodLabel = activePeriod === 'daily'
    ? format(parseISO(dailyDate), 'MMMM d, yyyy')
    : activePeriod === 'weekly'
      ? `Week of ${format(startOfWeek(parseISO(weekDate), { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(parseISO(weekDate), { weekStartsOn: 1 }), 'MMM d, yyyy')}`
      : format(parseISO(monthDate + '-01'), 'MMMM yyyy');

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center h-full">
        <p className="text-ink/30 text-sm">Loading reports...</p>
      </div>
    );
  }

  const reportCards: {
    period: ReportPeriod;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
    iconText: string;
    inputType: string;
    value: string;
    onChange: (val: string) => void;
  }[] = [
    {
      period: 'daily',
      title: 'Daily Report',
      subtitle: 'Single day summary with all visit details',
      icon: <Calendar className="w-5 h-5" />,
      iconBg: 'bg-gold-light',
      iconText: 'text-gold',
      inputType: 'date',
      value: dailyDate,
      onChange: setDailyDate,
    },
    {
      period: 'weekly',
      title: 'Weekly Report',
      subtitle: 'Full week overview (Mon – Sun)',
      icon: <CalendarDays className="w-5 h-5" />,
      iconBg: 'bg-sky-light',
      iconText: 'text-sky',
      inputType: 'date',
      value: weekDate,
      onChange: setWeekDate,
    },
    {
      period: 'monthly',
      title: 'Monthly Report',
      subtitle: 'Complete month data export',
      icon: <CalendarRange className="w-5 h-5" />,
      iconBg: 'bg-lavender-light',
      iconText: 'text-lavender',
      inputType: 'month',
      value: monthDate,
      onChange: setMonthDate,
    },
  ];

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-ink">Reports</h1>
        <p className="text-ink/40 mt-1 text-sm">
          Generate and download visit reports for any period
        </p>
      </div>

      {/* Quick Stats */}
      <div className="card !p-5 lg:!p-6 mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-mint-light flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-mint" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-ink">Quick Stats</h2>
              <p className="text-ink/40 text-xs">{periodLabel}</p>
            </div>
          </div>
          <div className="flex gap-1 bg-cream rounded-xl p-1">
            {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  activePeriod === p
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-ink/40 hover:text-ink/60'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
          <div className="rounded-2xl bg-sky-light/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-sky" />
              <span className="text-xs font-medium text-ink/50">Total Visits</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{quickStats.total}</p>
          </div>
          <div className="rounded-2xl bg-mint-light/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <LogIn className="w-4 h-4 text-mint" />
              <span className="text-xs font-medium text-ink/50">Checked In</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{quickStats.checkedIn}</p>
          </div>
          <div className="rounded-2xl bg-lavender-light/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <LogOut className="w-4 h-4 text-lavender" />
              <span className="text-xs font-medium text-ink/50">Checked Out</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{quickStats.checkedOut}</p>
          </div>
          <div className="rounded-2xl bg-coral-light/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-coral" />
              <span className="text-xs font-medium text-ink/50">Allergies Flagged</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{quickStats.allergies}</p>
          </div>
          <div className="rounded-2xl bg-gold-light/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-gold" />
              <span className="text-xs font-medium text-ink/50">Activity Revenue</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{quickStats.activityRevenue} <span className="text-sm font-semibold text-ink/40">AED</span></p>
            <p className="text-[10px] text-ink/30 mt-0.5">{quickStats.activitiesCount} activities · {quickStats.activityKids} kids</p>
          </div>
        </div>
      </div>

      {/* Report Period Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {reportCards.map(card => {
          const stats = getStats(card.period);
          return (
            <div key={card.period} className="card !p-5 lg:!p-6 flex flex-col">
              {/* Card header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <span className={card.iconText}>{card.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-ink">{card.title}</h3>
                  <p className="text-ink/40 text-xs">{card.subtitle}</p>
                </div>
              </div>

              {/* Date picker */}
              <label className="block mb-4">
                <span className="text-xs font-medium text-ink/50 mb-1.5 block">Select date</span>
                <input
                  type={card.inputType}
                  value={card.value}
                  onChange={e => card.onChange(e.target.value)}
                  className="input w-full"
                />
              </label>

              {/* Includes summary */}
              <div className="rounded-2xl bg-cream p-3.5 mb-5 space-y-2 flex-1">
                <p className="text-xs font-semibold text-ink/50 mb-2">Includes</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink/50">Total visits</span>
                  <span className="font-bold text-ink">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink/50">Check-ins</span>
                  <span className="font-bold text-mint">{stats.checkedIn}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink/50">Check-outs</span>
                  <span className="font-bold text-lavender">{stats.checkedOut}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink/50">Allergies flagged</span>
                  <span className="font-bold text-coral">{stats.allergies}</span>
                </div>
                {stats.activitiesCount > 0 && (
                  <>
                    <div className="border-t border-cream-dark my-1.5" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink/50">Activities</span>
                      <span className="font-bold text-ink">{stats.activitiesCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink/50">Kids in activities</span>
                      <span className="font-bold text-sky">{stats.activityKids}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink/50">Activity revenue</span>
                      <span className="font-bold text-gold">{stats.activityRevenue} AED</span>
                    </div>
                  </>
                )}
              </div>

              {/* Download buttons */}
              {stats.total > 0 ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadCSV(card.period)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm bg-ink text-cream hover:bg-ink/90 active:scale-[0.98] transition-all"
                  >
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button
                    onClick={() => downloadPDF(card.period)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm bg-coral text-white hover:bg-coral/90 active:scale-[0.98] transition-all"
                  >
                    <FileDown className="w-4 h-4" /> PDF
                  </button>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm bg-ink/10 text-ink/30">
                  <Download className="w-4 h-4" /> No data for this period
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
