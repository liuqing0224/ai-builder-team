import { AdminApp } from "./AdminApp.jsx";
import { PublicApp } from "./PublicApp.jsx";

export function App(){
  return location.pathname.startsWith("/admin") ? <AdminApp/> : <PublicApp/>;
}
