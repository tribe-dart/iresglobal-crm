import type { Metadata } from "next";
import ExecutiveWorkspace from "./ExecutiveWorkspace";
import "./executive.css";

export const metadata: Metadata = {
  title: "Executive workspace | Matryvo + Ires Global",
  robots: { index: false, follow: false },
};

export default function ExecutivePage() {
  return <ExecutiveWorkspace />;
}
