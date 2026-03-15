"use client";

import { Bar } from "react-chartjs-2";
import "chart.js/auto";

interface FeatureContribution {
  feature: string;
  shap_value: number;
}

interface FeatureContributionChartProps {
  data: FeatureContribution[];
}

export default function FeatureContributionChart({
  data,
}: FeatureContributionChartProps) {
  const chartData = {
    labels: data.map((item: FeatureContribution) => item.feature),
    datasets: [
      {
        label: "Contributing Factor",
        data: data.map((item: FeatureContribution) => item.shap_value),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Top Contributing Factors",
      },
    },
  };

  return (
    <div>
      <h2>Feature Contribution Analysis</h2>
      <Bar data={chartData} options={options} />
    </div>
  );
}