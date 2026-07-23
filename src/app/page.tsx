import { redirect } from "next/navigation";

// El middleware decide: con sesión llega al panel, sin sesión va a /login.
export default function Home() {
  redirect("/dashboard");
}
