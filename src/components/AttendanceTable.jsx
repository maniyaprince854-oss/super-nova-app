import "./AttendanceTable.css";

export default function AttendanceTable({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="att-empty">
        <span className="att-empty-icon">📋</span>
        <p>No attendance records yet</p>
      </div>
    );
  }

  return (
    <div className="att-table-wrapper">
      <table className="att-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, i) => {
            const dateObj = new Date(entry.date + "T00:00:00");
            const formatted = dateObj.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <tr key={i} className={`att-row att-row--${entry.status}`}>
                <td className="att-date">{formatted}</td>
                <td>
                  <span className={`att-badge att-badge--${entry.status}`}>
                    {entry.status === "present" ? "✓ Present" : "✗ Absent"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
