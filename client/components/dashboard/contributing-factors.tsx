import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ContributingFactorsProps {
  factors: { feature: string; shap_value: number }[];
}

const ContributingFactors: React.FC<ContributingFactorsProps> = ({ factors }) => {
  const data = {
    labels: factors.map((factor) => factor.feature),
    datasets: [
      {
        label: "Feature Contribution (%)",
        data: factors.map((factor) => factor.shap_value),
        backgroundColor: "rgba(0, 217, 255, 0.5)",
        borderColor: "rgba(0, 217, 255, 1)",
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
        text: "Contributing Factors",
      },
    },
  };

  return (
    <div className="mt-6 p-4 bg-[#1a1f3a] rounded-lg border border-[#00d9ff]/20">
      <Bar data={data} options={options} />
    </div>
  );
};

export default ContributingFactors;