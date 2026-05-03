import { redirect } from "next/navigation";

// About page removed. Anyone hitting this route is redirected home.
export default function AboutPage() {
  redirect("/");
}
