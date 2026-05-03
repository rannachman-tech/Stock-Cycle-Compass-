import { redirect } from "next/navigation";

// Methodology page removed. Anyone hitting this route is redirected home.
export default function MethodologyPage() {
  redirect("/");
}
