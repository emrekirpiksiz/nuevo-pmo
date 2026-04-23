import { redirect } from "next/navigation";

export default function CustomerLoginRedirectPage() {
  redirect("/admin/login");
}
