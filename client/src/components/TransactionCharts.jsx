import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

// Each category keeps the same colour when totals change.
const categoryColors = {
  Salary: "#285c45",
  Freelance: "#698eae",
  Gift: "#b49556",
  Food: "#bf765e",
  Transport: "#648ba4",
  Housing: "#7b78a5",
  Bills: "#b49850",
  Education: "#638567",
  Health: "#a46686",
  Entertainment: "#609a94",
  Other: "#89908a",
};

function formatMoney(cents) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(cents / 100);
}

function DistributionChart({ title, items, scopeLabel }) {
  const totalCents = items.reduce((total, item) => total + item.amountCents, 0);

  const chartData = {
    labels: items.map((item) => item.category),
    datasets: [
      {
        label: title,
        data: items.map((item) => item.amountCents),
        backgroundColor: items.map(
          (item) => categoryColors[item.category] || "#89908a",
        ),
        borderColor: "#dce5d8",
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    animation: false,
    layout: {
      padding: 12,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label(context) {
            const amountCents = Number(context.raw);
            const percentage = ((amountCents / totalCents) * 100).toFixed(1);

            return (
              `${context.label}: ${formatMoney(amountCents)} ` +
              `(${percentage}%)`
            );
          },
        },
      },
    },
  };

  return (
    <article className="preview-card distribution-card">
      <h2>{title}</h2>
      <p className="muted filter-scope">{scopeLabel}</p>

      {totalCents === 0 ? (
        <div className="chart-empty">
          <p>No records to display yet.</p>
          <p className="muted">No matching transactions in this view.</p>
        </div>
      ) : (
        <>
          <p className="chart-total">{formatMoney(totalCents)}</p>

          <div className="chart-canvas-container">
            <Doughnut
              data={chartData}
              options={chartOptions}
              role="img"
              aria-label={
                `${title}. Total ${formatMoney(totalCents)}. ` +
                "Category amounts and percentages are listed below."
              }
            />
          </div>

          <div className="chart-table-container">
            <table className="chart-table">
              <caption className="visually-hidden">
                {title}: category amounts and shares
              </caption>

              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.category}>
                    <th scope="row">
                      <span
                        className="chart-color-dot"
                        style={{
                          backgroundColor:
                            categoryColors[item.category] || "#89908a",
                        }}
                        aria-hidden="true"
                      />
                      {item.category}
                    </th>

                    <td>{formatMoney(item.amountCents)}</td>

                    <td>
                      {((item.amountCents / totalCents) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </article>
  );
}

export default function TransactionCharts({
  breakdown,
  scopeLabel = "All recorded transactions",
}) {
  if (!breakdown) {
    return (
      <p role="status">
        Chart data is unavailable. Restart the updated backend and refresh the
        page.
      </p>
    );
  }

  return (
    <section className="charts-grid" aria-label="Financial distributions">
      <DistributionChart
        title="Income distribution"
        scopeLabel={scopeLabel}
        items={breakdown.income}
      />

      <DistributionChart
        title="Expense distribution"
        scopeLabel={scopeLabel}
        items={breakdown.expense}
      />
    </section>
  );
}
