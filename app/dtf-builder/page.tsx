import Builder from "./Builder";
import "./builder.css";

export const metadata = {
  title: "Build Your Own DTF Gang Sheet | iPrintRush",
  description:
    "Upload your artwork, arrange your DTF gang sheet, and get it printed in high quality 300 DPI. We offer custom DTF transfers up to 120 inches long.",
  keywords: [
    "DTF gang sheet",
    "custom DTF transfers",
    "gang sheet builder",
    "direct to film",
    "custom apparel printing",
    "iPrintRush gang sheet",
  ],
  openGraph: {
    title: "Build Your Own DTF Gang Sheet | iPrintRush",
    description:
      "Upload your artwork, arrange your DTF gang sheet, and get it printed in high quality 300 DPI.",
    url: "https://iprintrush.com/dtf-builder",
    siteName: "iPrintRush",
    type: "website",
  },
};

export default function DTFBuilderPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Build Your DTF Gang Sheet</h1>
        <p className="text-gray-600 mb-8">Upload your designs, arrange them on the canvas, and we'll print your gang sheet at stunning 300 DPI.</p>
        <Builder />
      </div>
    </div>
  );
}
